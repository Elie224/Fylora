/**
 * Configuration Artillery pour tests de charge avancés
 * Artillery est un outil professionnel pour les tests de charge
 * 
 * Installation: npm install -g artillery
 * Usage: artillery run backend/tests/loadTestArtillery.js
 */

module.exports = {
  config: {
    target: process.env.API_URL || 'http://localhost:5001',
    phases: [
      {
        name: 'Warm-up',
        duration: 60,
        arrivalRate: 10, // 10 requêtes/seconde
      },
      {
        name: 'Ramp-up',
        duration: 300,
        arrivalRate: 10,
        rampTo: 100, // Augmenter jusqu'à 100 req/s
      },
      {
        name: 'Sustained load',
        duration: 600,
        arrivalRate: 100, // Maintenir 100 req/s pendant 10 minutes
      },
      {
        name: 'Spike',
        duration: 60,
        arrivalRate: 1000, // Pic de 1000 req/s
      },
      {
        name: 'Cool-down',
        duration: 120,
        arrivalRate: 100,
        rampTo: 10, // Redescendre à 10 req/s
      },
    ],
    defaults: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  },
  scenarios: [
    {
      name: 'Authentification et upload',
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ $processEnvironment.TEST_EMAIL }}',
              password: '{{ $processEnvironment.TEST_PASSWORD }}',
            },
            capture: [
              {
                json: '$.data.access_token',
                as: 'token',
              },
            ],
          },
        },
        {
          think: 1, // Pause 1 seconde
        },
        {
          post: {
            url: '/api/files/upload',
            headers: {
              Authorization: 'Bearer {{ token }}',
            },
            beforeRequest: 'setUploadBody',
          },
        },
      ],
    },
    {
      name: 'Lecture de fichiers',
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ $processEnvironment.TEST_EMAIL }}',
              password: '{{ $processEnvironment.TEST_PASSWORD }}',
            },
            capture: [
              {
                json: '$.data.access_token',
                as: 'token',
              },
            ],
          },
        },
        {
          get: {
            url: '/api/files',
            headers: {
              Authorization: 'Bearer {{ token }}',
            },
          },
        },
        {
          think: 2,
        },
      ],
    },
    {
      name: 'Dashboard',
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ $processEnvironment.TEST_EMAIL }}',
              password: '{{ $processEnvironment.TEST_PASSWORD }}',
            },
            capture: [
              {
                json: '$.data.access_token',
                as: 'token',
              },
            ],
          },
        },
        {
          get: {
            url: '/api/dashboard',
            headers: {
              Authorization: 'Bearer {{ token }}',
            },
          },
        },
      ],
    },
  ],
};

