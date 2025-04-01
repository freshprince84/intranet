import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';

// Props bleiben gleich, da sie vom Parent (TimeTrackerBox) kommen
interface SimpleSliderProps {
  onConfirm: () => void;
  isTimerRunning: boolean;
  text?: string; // Wird weiterhin für den Anzeigetext genutzt
  height?: number; // Kann für die Höhe des Containers genutzt werden
  thumbColor?: string;
  trackColor?: string;
  textColor?: string;
  disabled?: boolean;
}

// Breite für Layout-Berechnung (kann angepasst werden)
const CONTAINER_WIDTH = Dimensions.get('window').width * 0.75 - 20; 

const SimpleSlider: React.FC<SimpleSliderProps> = ({
  onConfirm,
  isTimerRunning,
  text,
  height = 75, // Erhöht für bessere Touch-Fläche
  thumbColor = '#3B82F6',
  trackColor = '#E5E7EB',
  textColor = '#111827',
  disabled = false,
}) => {
  // State für den Slider-Wert (0 für gestoppt, 1 für läuft)
  const [sliderValue, setSliderValue] = useState(() => (isTimerRunning ? 1 : 0));

  // Effekt: Synchronisiere den Slider-Wert, wenn sich isTimerRunning ändert
  useEffect(() => {
    setSliderValue(isTimerRunning ? 1 : 0);
  }, [isTimerRunning]);

  // Handler für das Ende des Ziehens
  const handleSlidingComplete = (value: number) => {
    if (!disabled) {
      if (value === 1 && !isTimerRunning) { 
        // Nur 'onConfirm' auslösen, wenn nach rechts gezogen wurde UND der Timer noch nicht lief
        onConfirm();
      } else if (value === 0 && isTimerRunning) {
         // Nur 'onConfirm' auslösen, wenn nach links gezogen wurde UND der Timer lief
         onConfirm();
      } else {
        // Wenn nicht bis zum Ende gezogen oder Status bereits korrekt, auf den korrekten Ruhewert zurücksetzen
        setSliderValue(isTimerRunning ? 1 : 0);
      }
    }
  };

  // Text, der über dem Slider angezeigt wird
  const sliderText = text ?? (isTimerRunning ? 'Zum Stoppen nach links ziehen' : 'Zum Starten nach rechts ziehen');

  return (
    // Umschließende View für Layout und Textplatzierung
    <View style={[styles.container, { height: height, opacity: disabled ? 0.5 : 1 }]}>
       {/* Text über dem Slider */}
       <Text style={[styles.sliderText, { color: textColor }]}>
         {sliderText}
       </Text>
       <View style={[styles.sliderContainer, { height: height * 0.8, backgroundColor: trackColor }]}>
         <Slider
           style={styles.slider}
           minimumValue={0}
           maximumValue={1}
           step={1}
           value={sliderValue}
           onValueChange={setSliderValue}
           onSlidingComplete={handleSlidingComplete}
           disabled={disabled}
           minimumTrackTintColor={thumbColor}
           maximumTrackTintColor={trackColor}
           thumbTintColor={thumbColor}
           tapToSeek={false}
         />
       </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_WIDTH,
    justifyContent: 'center', // Zentriert Slider und Text vertikal
    alignItems: 'center',    // Zentriert Slider und Text horizontal
    paddingHorizontal: 5,   // Kleiner Innenabstand
    // backgroundColor: 'rgba(255,0,0,0.1)', // Debug-Hintergrund
  },
  sliderContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 25, // Abgerundete Ecken für den Container
  },
  slider: {
    width: '100%',
    height: '100%',
  },
  sliderText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8, // Etwas mehr Abstand zum Slider
    textAlign: 'center',
  },
});

export default SimpleSlider; 