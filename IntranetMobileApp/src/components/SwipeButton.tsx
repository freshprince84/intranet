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
  trackColor = '#FFFFFF', // Weiß statt dunkelgrau
  textColor = '#374151', // Dunkelgrau für Text
  disabled = false,
}) => {
  // Wir verwenden React Native's eigene Animated API statt Reanimated
  const [translateX] = useState(new Animated.Value(isTimerRunning ? SWIPE_RANGE : 0));
  
  // Text, der im Track angezeigt wird
  const swipeText = text ?? (isTimerRunning ? 'Nach links ziehen zum Stoppen' : 'Nach rechts ziehen zum Starten');
  
  // Farbe je nach Status
  const dynamicButtonColor = isTimerRunning ? '#F44336' : buttonColor; // Rot für Stop
  
  // Text-Opacity für Ausblenden während des Swipes
  const [textOpacity, setTextOpacity] = useState(1);

  // Setze die initiale Position wenn sich isTimerRunning ändert
  useEffect(() => {
    Animated.spring(translateX, {
      toValue: isTimerRunning ? SWIPE_RANGE : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start();
  }, [isTimerRunning]);

  // Handler für den Swipe mit korrektem Typ
  const handleGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    
    if (isTimerRunning) {
      // Wenn Timer läuft: Nach links wischen (negative translationX)
      const newPosition = SWIPE_RANGE + Math.min(0, Math.max(translationX, -SWIPE_RANGE));
      translateX.setValue(newPosition);
      
      // Text ausblenden während des Swipes
      if (newPosition < SWIPE_RANGE * 0.7) {
        setTextOpacity(0);
      } else {
        setTextOpacity(Math.min(1, (newPosition - SWIPE_RANGE * 0.5) / (SWIPE_RANGE * 0.2)));
      }
    } else {
      // Wenn Timer gestoppt: Nach rechts wischen (positive translationX)
      const newPosition = Math.max(0, Math.min(translationX, SWIPE_RANGE));
      translateX.setValue(newPosition);
      
      // Text ausblenden während des Swipes
      if (newPosition > SWIPE_RANGE * 0.3) {
        setTextOpacity(0);
      } else {
        setTextOpacity(Math.max(0, 1 - (newPosition / (SWIPE_RANGE * 0.5))));
      }
    }
  };

  // Kombinierter Handler für das Gesturen-Ende
  const handleHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      if (isTimerRunning) {
        // Wenn Timer läuft: Nach links wischen zum Stoppen
        if (translationX < -SWIPE_RANGE * confirmThreshold) {
          onSwipeComplete();
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
          // Zurück nach rechts
          Animated.spring(translateX, {
            toValue: SWIPE_RANGE,
            useNativeDriver: true,
            tension: 50,
            friction: 7
          }).start();
          setTextOpacity(1);
        }
      } else {
        // Wenn Timer gestoppt: Nach rechts wischen zum Starten
        if (translationX > SWIPE_RANGE * confirmThreshold) {
          onSwipeComplete();
          setTimeout(() => {
            Animated.spring(translateX, {
              toValue: SWIPE_RANGE,
              useNativeDriver: true,
              tension: 50,
              friction: 7
            }).start();
            setTextOpacity(1);
          }, 200);
        } else {
          // Zurück nach links
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7
          }).start();
          setTextOpacity(1);
        }
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
    borderWidth: 1,
    borderColor: '#D1D5DB', // Grauer Rahmen
  },
  trackText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  thumb: {
    borderRadius: THUMB_SIZE / 2,
    position: 'absolute',
    left: 5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 0,
    shadowColor: undefined,
    shadowOffset: undefined,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
});

export default SwipeButton; 