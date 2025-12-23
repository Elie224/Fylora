import 'package:flutter/material.dart';
import '../utils/constants.dart';

/// Widget logo personnalisé pour Fylora
/// Affiche le texte "Fylora" avec un style moderne et élégant
class FyloraLogo extends StatelessWidget {
  final double size;
  final bool showIcon;
  final Color? textColor;
  final bool useGradient;

  const FyloraLogo({
    super.key,
    this.size = 120,
    this.showIcon = true,
    this.textColor,
    this.useGradient = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveTextColor = textColor ?? 
        (isDark ? AppConstants.fyloraWhite : AppConstants.fyloraBlue);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showIcon)
          Container(
            width: size,
            height: size,
            padding: EdgeInsets.all(size * 0.2),
            decoration: BoxDecoration(
              gradient: useGradient
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppConstants.fyloraBlue,
                        AppConstants.fyloraDarkBlue,
                      ],
                    )
                  : null,
              color: useGradient ? null : AppConstants.fyloraBlue,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppConstants.fyloraBlue.withOpacity(0.3),
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Center(
              child: Text(
                'Fylora',
                style: TextStyle(
                  fontSize: size * 0.28,
                  fontWeight: FontWeight.bold,
                  color: AppConstants.fyloraWhite,
                  letterSpacing: 2.0,
                  height: 1.0,
                  shadows: [
                    Shadow(
                      color: Colors.black.withOpacity(0.3),
                      offset: const Offset(0, 2),
                      blurRadius: 4,
                    ),
                  ],
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        if (showIcon) SizedBox(height: size * 0.3),
        // Texte "Fylora" en dessous
        ShaderMask(
          shaderCallback: (bounds) {
            if (useGradient) {
              return const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppConstants.fyloraBlue,
                  AppConstants.fyloraDarkBlue,
                ],
              ).createShader(bounds);
            }
            return LinearGradient(
              colors: [effectiveTextColor, effectiveTextColor],
            ).createShader(bounds);
          },
          child: Text(
            'Fylora',
            style: TextStyle(
              fontSize: size * 0.35,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: 2.0,
            ),
          ),
        ),
      ],
    );
  }
}

/// Version compacte du logo (juste le texte)
class FyloraLogoCompact extends StatelessWidget {
  final double fontSize;
  final Color? color;
  final bool useGradient;

  const FyloraLogoCompact({
    super.key,
    this.fontSize = 32,
    this.color,
    this.useGradient = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveColor = color ?? 
        (isDark ? AppConstants.fyloraWhite : AppConstants.fyloraBlue);

    if (useGradient) {
      return ShaderMask(
        shaderCallback: (bounds) {
          return const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppConstants.fyloraBlue,
              AppConstants.fyloraDarkBlue,
            ],
          ).createShader(bounds);
        },
        child: Text(
          'Fylora',
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: FontWeight.bold,
            color: Colors.white,
            letterSpacing: 1.5,
          ),
        ),
      );
    }

    return Text(
      'Fylora',
      style: TextStyle(
        fontSize: fontSize,
        fontWeight: FontWeight.bold,
        color: effectiveColor,
        letterSpacing: 1.5,
      ),
    );
  }
}














