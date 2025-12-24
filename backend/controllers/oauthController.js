const passport = require('passport');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const User = require('../models/userModel');
const Session = require('../models/sessionModel');
const config = require('../config');

// Middleware pour initialiser l'authentification OAuth
const initiateOAuth = (provider) => {
  return (req, res, next) => {
    // Vérifier si le provider est configuré
    const providerConfig = config.oauth[provider];
    
    // Log de débogage
    console.log(`[OAuth ${provider}] Checking configuration...`);
    console.log(`[OAuth ${provider}] Config object:`, {
      exists: !!providerConfig,
      clientId: providerConfig?.clientId ? 'present' : 'missing',
      clientSecret: providerConfig?.clientSecret ? 'present' : 'missing',
      redirectUri: providerConfig?.redirectUri || 'not set'
    });
    
    if (!providerConfig || !providerConfig.clientId || !providerConfig.clientSecret) {
      console.error(`OAuth ${provider} not configured: missing credentials`);
      console.error(`  Provider config exists: ${!!providerConfig}`);
      console.error(`  Client ID present: ${!!providerConfig?.clientId}`);
      console.error(`  Client Secret present: ${!!providerConfig?.clientSecret}`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      return res.redirect(`${frontendUrl}/login?error=oauth_not_configured&message=${encodeURIComponent(`OAuth ${provider} is not configured. Please contact the administrator.`)}`);
    }
    
    // Vérifier que la stratégie Passport existe
    if (!passport._strategies || !passport._strategies[provider]) {
      console.error(`OAuth ${provider} strategy not found in Passport`);
      console.error(`Available strategies:`, Object.keys(passport._strategies || {}));
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      return res.redirect(`${frontendUrl}/login?error=oauth_not_configured&message=${encodeURIComponent(`OAuth ${provider} strategy is not registered. Please check server configuration.`)}`);
    }
    
    console.log(`[OAuth ${provider}] Configuration OK, initiating authentication...`);

    // Stocker l'URL de redirection après connexion si fournie
    if (req.query.redirect) {
      req.session.oauthRedirect = req.query.redirect;
    }
    
    // Stocker le redirect_uri pour mobile (deep link)
    if (req.query.redirect_uri) {
      req.session.oauthRedirectUri = req.query.redirect_uri;
    }

    try {
      passport.authenticate(provider, { scope: provider === 'google' ? ['profile', 'email'] : ['user:email'] })(req, res, next);
    } catch (error) {
      console.error(`Error initiating OAuth ${provider}:`, error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/login?error=oauth_init_failed&message=${encodeURIComponent(error.message || 'Failed to initiate OAuth')}`);
    }
  };
};

// Callback OAuth - génère les tokens et redirige vers le frontend
const handleOAuthCallback = (provider) => {
  return async (req, res, next) => {
    passport.authenticate(provider, { session: false }, async (err, user, info) => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      
      if (err) {
        logOAuthError(provider, err, {
          stage: 'callback',
          queryParams: req.query,
          callbackURL: config.oauth[provider]?.redirectUri
        });
        
        // GitHub OAuth désactivé - Google uniquement
        
        // Messages d'erreur spécifiques selon le type d'erreur
        let errorMessage = 'Erreur lors de l\'authentification OAuth';
        let errorCode = 'oauth_failed';
        
        if (err.message) {
          if (err.message.includes('deleted_client')) {
            errorMessage = `Le client OAuth ${provider} a été supprimé. Veuillez créer un nouveau client OAuth dans Google Cloud Console.`;
            errorCode = 'oauth_client_deleted';
          } else if (err.message.includes('redirect_uri_mismatch') || err.message.includes('redirect_uri')) {
            errorMessage = `L'URI de redirection n'est pas configurée correctement. Vérifiez que l'URI exacte est configurée dans les paramètres OAuth de ${provider}.`;
            errorCode = 'oauth_redirect_mismatch';
          } else if (err.message.includes('invalid_client') || err.message.includes('incorrect_client_credentials') || err.message.includes('bad_verification_code')) {
            errorMessage = `Les identifiants OAuth ${provider} sont incorrects ou le Client Secret a été régénéré. Vérifiez votre fichier .env et régénérez le Client Secret si nécessaire.`;
            errorCode = 'oauth_invalid_credentials';
          } else if (err.message.includes('Failed to obtain access token')) {
            errorMessage = `Échec de l'obtention du token d'accès ${provider}. Vérifiez que le Client Secret est correct et que l'URI de redirection correspond exactement dans Google Cloud Console.`;
            errorCode = 'oauth_token_failed';
          } else if (err.message.includes('access_denied')) {
            errorMessage = 'Vous avez annulé l\'autorisation. Veuillez réessayer.';
            errorCode = 'oauth_access_denied';
          } else {
            errorMessage = err.message;
          }
        }
        
        return res.redirect(`${frontendUrl}/login?error=${errorCode}&message=${encodeURIComponent(errorMessage)}`);
      }

      if (!user) {
        console.error(`OAuth ${provider}: No user returned from authentication`);
        console.error(`Info:`, info);
        const errorMessage = info?.message || 'Échec de l\'authentification. Veuillez réessayer.';
        return res.redirect(`${frontendUrl}/login?error=oauth_failed&message=${encodeURIComponent(errorMessage)}`);
      }

      try {
        // Vérifier que l'utilisateur a bien un email
        if (!user.email) {
          throw new Error('Aucun email trouvé dans le profil OAuth');
        }

        // Mettre à jour last_login_at
        await User.updateLastLogin(user.id);

        // Générer les tokens JWT
        const payload = { id: user.id, email: user.email };
        const access_token = generateAccessToken(payload);
        const refresh_token = generateRefreshToken(payload);

        // Créer une session
        try {
          const userAgent = req.get('user-agent') || null;
          const ip = req.ip || req.headers['x-forwarded-for'] || null;
          await Session.createSession({
            userId: user.id,
            refreshToken: refresh_token,
            userAgent,
            ipAddress: ip,
            deviceName: null,
            expiresIn: config.jwt.refreshExpiresIn
          });
        } catch (sessionErr) {
          console.error('Failed to create session for OAuth user:', sessionErr.message || sessionErr);
          // Ne pas bloquer la connexion si la session échoue
        }

        // Vérifier si c'est une requête mobile (deep link)
        const redirectUri = req.query.redirect_uri || req.session?.oauthRedirectUri;
        const isMobile = redirectUri && redirectUri.startsWith('fylora://');
        
        if (isMobile) {
          // Rediriger vers le deep link mobile avec les tokens
          const mobileRedirect = `${redirectUri}?token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}`;
          console.log(`OAuth ${provider} success (mobile): User ${user.email} authenticated`);
          return res.redirect(mobileRedirect);
        }
        
        // Rediriger vers le frontend web avec les tokens dans l'URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const redirectUrl = req.session?.oauthRedirect || '/dashboard';
        
        // Encoder les tokens pour les passer dans l'URL
        const tokens = encodeURIComponent(JSON.stringify({ access_token, refresh_token }));
        console.log(`OAuth ${provider} success: User ${user.email} authenticated`);
        res.redirect(`${frontendUrl}/auth/callback?tokens=${tokens}&redirect=${encodeURIComponent(redirectUrl)}`);
      } catch (error) {
        console.error(`OAuth ${provider} callback error:`, error);
        
        // Vérifier si c'est une requête mobile
        const redirectUri = req.query.redirect_uri || req.session?.oauthRedirectUri;
        const isMobile = redirectUri && redirectUri.startsWith('fylora://');
        
        if (isMobile) {
          const errorMessage = error.message || 'Erreur lors de l\'authentification OAuth';
          const mobileErrorRedirect = `${redirectUri}?error=${encodeURIComponent(errorMessage)}`;
          return res.redirect(mobileErrorRedirect);
        }
        
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const errorMessage = error.message || 'Erreur lors du traitement de l\'authentification OAuth';
        res.redirect(`${frontendUrl}/login?error=oauth_failed&message=${encodeURIComponent(errorMessage)}`);
      }
    })(req, res, next);
  };
};

module.exports = {
  initiateOAuth,
  handleOAuthCallback,
};

