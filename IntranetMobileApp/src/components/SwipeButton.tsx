import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface SwipeButtonProps {
  onSwipeComplete: () => void;
  isTimerRunning: boolean;
  text?: string;
  confirmThreshold?: number;
  height?: number;
  buttonColor?: string;
  trackColor?: string;
  textColor?: string;
  disabled?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const BUTTON_WIDTH = SCREEN_WIDTH * 0.8; // 80% der Bildschirmbreite
const THUMB_SIZE = 50; // Grösse des runden Buttons
const SWIPE_RANGE = BUTTON_WIDTH - THUMB_SIZE - 10; // Swipe-Bereich (mit Padding)

const SwipeButton: React.FC<SwipeButtonProps> = ({
  onSwipeComplete,
  isTimerRunning,
  text,
  confirmThreshold = 0.8,
  height = 60,
  buttonColor = '#00C853', // Grün für Start (ähnlich SBB)
  trackColor = '#333333', // Dunkelgrau für Track
  textColor = '#FFFFFF', // Weiss für Text
  disabled = false,
}) => {
  // Wir verwenden React Native's eigene Animated API statt Reanimated
  const [translateX] = useState(new Animated.Value(0));
  
  // Text, der im Track angezeigt wird
  const swipeText = text ?? (isTimerRunning ? 'Swipe zum Stoppen' : 'Swipe zum Starten');
  
  // Farbe je nach Status
  const dynamicButtonColor = isTimerRunning ? '#F44336' : buttonColor; // Rot für Stop
  
  // Text-Opacity für Ausblenden während des Swipes
  const [textOpacity, setTextOpacity] = useState(1);

  // Handler für den Swipe mit korrektem Typ
  const handleGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    
    // Begrenze die Position zwischen 0 und SWIPE_RANGE
    const newPosition = Math.max(0, Math.min(translationX, SWIPE_RANGE));
    
    // Aktualisiere die Position und Opacity
    translateX.setValue(newPosition);
    
    // Text ausblenden während des Swipes
    if (newPosition > SWIPE_RANGE * 0.3) {
      setTextOpacity(0);
    } else {
      setTextOpacity(Math.max(0, 1 - (newPosition / (SWIPE_RANGE * 0.5))));
    }
  };

  // Kombinierter Handler für das Gesturen-Ende
  const handleHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      // Prüfe, ob Schwellwert erreicht wurde
      if (translationX > SWIPE_RANGE * confirmThreshold) {
        // Aktion ausführen
        onSwipeComplete();
        
        // Nach kurzer Verzögerung zurückspringen
        setTimeout(() => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7
          }).start();
          setTextOpacity(1);
        }, 200);
      } else {
        // Sofort zurückspringen, wenn nicht weit genug
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7
        }).start();
        setTextOpacity(1);
      }
    }
  };

  return (
    <View style={[styles.container, { opacity: disabled ? 0.6 : 1 }]}>
      <View style={[styles.track, { backgroundColor: trackColor, height }]}>
        <Animated.Text 
          style={[
            styles.trackText, 
            { color: textColor, opacity: textOpacity }
          ]}
        >
          {swipeText}
        </Animated.Text>
        
        <PanGestureHandler 
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleHandlerStateChange}
          enabled={!disabled}
        >
          <Animated.View 
            style={[
              styles.thumb, 
              { 
                backgroundColor: dynamicButtonColor, 
                height: THUMB_SIZE, 
                width: THUMB_SIZE,
                transform: [{ translateX: translateX }]
              }
            ]}
          >
            <MaterialCommunityIcons 
              name={isTimerRunning ? "stop" : "arrow-right"} 
              size={24} 
              color="white" 
            />
          </Animated.View>
        </PanGestureHandler>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  track: {
    width: BUTTON_WIDTH,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: THUMB_SIZE + 10, // Platz für den Thumb + etwas Abstand
    paddingRight: 10,
    overflow: 'hidden',
  },
  trackText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  thumb: {
    borderRadius: THUMB_SIZE / 2,
    position: 'absolute',
    left: 5, // Kleiner Abstand zum Rand
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // Android Schatten
    shadowColor: '#000', // iOS Schatten
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default SwipeButton; 