import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated'; // Benötigt reanimated v2+

// Prüfe, ob reanimated korrekt konfiguriert ist (babel.config.js)!
// plugins: ['react-native-reanimated/plugin'],

const SLIDER_WIDTH = Dimensions.get('window').width - 40; // Breite anpassen
const THUMB_WIDTH = 50; // Breite des Knopfes anpassen
const SLIDER_RANGE = SLIDER_WIDTH - THUMB_WIDTH - 4; // Bewegungsbereich (inkl. Padding/Border)

interface SlideToConfirmProps {
  onConfirm: () => void;
  isTimerRunning: boolean;
  text?: string; // Optional eigener Text
  confirmThreshold?: number; // Ab wann ausgelöst wird (default 0.8)
  height?: number;
  thumbColor?: string;
  trackColor?: string;
  textColor?: string;
}

const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  onConfirm,
  isTimerRunning,
  text,
  confirmThreshold = 0.8,
  height = 50,
  thumbColor = '#3B82F6', // Blau aus Design Standards
  trackColor = '#E5E7EB', // Mittelgrau aus Design Standards
  textColor = '#111827', // Schwarz aus Design Standards
}) => {
  const translateX = useSharedValue(0);
  const sliderText = text ?? (isTimerRunning ? 'Zum Stoppen ziehen' : 'Zum Starten ziehen');

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number }>({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      let newValue = ctx.startX + event.translationX;
      // Begrenze Bewegung nach links (nicht unter 0) und rechts (nicht über SLIDER_RANGE)
      translateX.value = Math.max(0, Math.min(newValue, SLIDER_RANGE));
    },
    onEnd: () => {
      if (translateX.value > SLIDER_RANGE * confirmThreshold) {
        // Auslösen nur wenn über Schwellenwert
        runOnJS(onConfirm)(); // JS-Funktion aus UI-Thread aufrufen
        translateX.value = withSpring(0); // Zurückspringen nach Bestätigung
      } else {
        translateX.value = withSpring(0); // Zurückspringen ohne Bestätigung
      }
    },
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
     // Text ausblenden, während man zieht
    const opacity = interpolate(
      translateX.value,
      [0, SLIDER_RANGE * 0.5], // Von 0 bis halber Weg
      [1, 0], // Von sichtbar zu unsichtbar
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const containerStyle = [
    styles.sliderContainer,
    { height: height, borderRadius: height / 2, backgroundColor: trackColor }
  ];
  const thumbStyle = [
    styles.thumb,
    { width: height - 4, height: height - 4, borderRadius: (height - 4) / 2, backgroundColor: thumbColor }
  ];
   const textStyle = [styles.sliderText, { color: textColor }];

  return (
     // RootView nur hier nötig, wenn nicht global in App.tsx
     // WICHTIG: Wenn GestureHandlerRootView nicht global in App.tsx ist,
     // muss sie hier verwendet werden, um Abstürze auf Android zu vermeiden.
     // Da wir es nicht wissen, fügen wir sie vorsichtshalber hinzu.
     <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={containerStyle}>
          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[thumbStyle, animatedThumbStyle]} />
          </PanGestureHandler>
          <Animated.Text style={[textStyle, animatedTextStyle]}>
            {sliderText}
          </Animated.Text>
        </View>
     </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  // Container und Text wie vorher, aber dynamischer
  sliderContainer: {
    width: SLIDER_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    // marginVertical: 10, // Wird in TimeTrackerBox gehandhabt
    // alignSelf: 'center', // Wird in TimeTrackerBox gehandhabt
  },
   thumb: {
     // Grösse wird jetzt dynamisch gesetzt
     position: 'absolute',
     left: 2,
     top: 2,
     zIndex: 2,
     justifyContent: 'center',
     alignItems: 'center',
  },
  sliderText: {
    fontSize: 16,
    fontWeight: '600', // Semibold
    zIndex: 1,
    position: 'absolute', // Damit es über dem Track liegt
  }
});

export default SlideToConfirm; 