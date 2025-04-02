# Implementierungsplan: Neugestaltung WorktimeScreen (Mobile App)

**Ziel:** Modernisierung des Designs des `WorktimeScreen` in der `IntranetMobileApp` gemäss den Vorgaben aus `docs/implementation_plans/modern_design.md`, `docs/core/DESIGN_STANDARDS.md` und zusätzlichen Benutzerwünschen, unter strikter Einhaltung der Projektregeln (`immer.mdc`, `mdfiles.mdc`).

**Vorgehen:** Schrittweise Implementierung mit Build & Test nach jedem abgeschlossenen Schritt.

**Dateien:**
*   **Plan:** `docs/implementation_plans/mobile_worktime_screen_redesign_detailed.md` (Diese Datei)
*   **Report:** `docs/implementation_reports/mobile_worktime_screen_redesign_detailed_implemented.md` (Wird während der Umsetzung gefüllt)

**WICHTIGER HINWEIS ZUR IMPLEMENTIERUNG:**
Dieser Plan dokumentiert die notwendigen Schritte. Bei jedem "STOPP" muss der Benutzer:
1. Die Änderungen prüfen
2. Die App selbst bauen
3. Die Funktionalität testen
4. Die Ergebnisse im Report-File `docs/implementation_reports/mobile_worktime_screen_redesign_detailed_implemented.md` protokollieren
5. Die Freigabe für den nächsten Schritt erteilen

Der Plan dient NUR der Dokumentation - alle Build- und Test-Aktionen werden vom Benutzer durchgeführt!

---

**Schritt 0: Vorbereitung**

*   **Aktion:** Stelle sicher, dass die Report-Datei `docs/implementation_reports/mobile_worktime_screen_redesign_detailed_implemented.md` existiert und leer ist.
*   **Aktion:** Stelle sicher, dass dein Git-Branch aktuell ist und keine ungespeicherten Änderungen vorhanden sind.
*   **STOPP:** Keine Build-Aktion nötig. Bestätige, dass die Vorbereitung abgeschlossen ist.

---

**Schritt 1: Abhängigkeit prüfen/installieren (`react-native-gesture-handler`)**

*   **Ziel:** Sicherstellen, dass die notwendige Bibliothek für den Slider verfügbar ist.
*   **Analyse:** Überprüfe die `IntranetMobileApp/package.json` auf den Eintrag `"react-native-gesture-handler"`.
*   **Aktion (Falls nicht vorhanden):**
    1.  Öffne ein Terminal im Verzeichnis `IntranetMobileApp`.
    2.  Führe `npm install react-native-gesture-handler` ODER `yarn add react-native-gesture-handler` aus.
    3.  Führe `cd ios && pod install && cd ..` aus.
*   **Wichtiger Hinweis:** Das Hinzufügen von nativen Abhängigkeiten erfordert oft einen Neustart des Metro Bundlers und manchmal eine Bereinigung der Builds (`android/gradlew clean`, Xcode Clean Build Folder).
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 2: Benutzerdefinierte Slider-Komponente erstellen (`SlideToConfirm.tsx`)**

*   **Ziel:** Erstellung der Basis-Komponente für den "Slide-to-Unlock"-Effekt.
*   **Aktion:**
    1.  Erstelle die Datei `IntranetMobileApp/src/components/SlideToConfirm.tsx`.
    2.  Füge folgenden initialen Code ein (dies ist ein Grundgerüst, Styling und volle Logik kommen später):
        ```typescript
        import React from 'react';
        import { View, Text, StyleSheet } from 'react-native';
        import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Wichtig!

        interface SlideToConfirmProps {
          onConfirm: () => void;
          isTimerRunning: boolean; // Um später Start/Stop Text anzuzeigen
          // Weitere Props für Styling etc. könnten folgen
        }

        const SlideToConfirm: React.FC<SlideToConfirmProps> = ({ onConfirm, isTimerRunning }) => {
          // TODO: Implement PanGestureHandler logic here later
          const sliderText = isTimerRunning ? 'Stoppen' : 'Starten';

          return (
            // Umschliesse mit GestureHandlerRootView, falls nicht schon in App.tsx vorhanden
            // <GestureHandlerRootView style={{ flex: 1 }}> // Ggf. nur hier nötig, wenn nicht global
              <View style={styles.sliderContainer}>
                <View style={styles.thumb}></View>
                <Text style={styles.sliderText}>{sliderText}</Text>
              </View>
            // </GestureHandlerRootView>
          );
        };

        const styles = StyleSheet.create({
          sliderContainer: {
            height: 50,
            borderRadius: 25,
            backgroundColor: '#e0e0e0', // Platzhalterfarbe
            justifyContent: 'center',
            alignItems: 'center', // Zentriert Text, Knopf wird absolut positioniert
            position: 'relative',
            overflow: 'hidden', // Wichtig für Slider-Effekt
            marginVertical: 10,
            marginHorizontal: 20,
          },
          thumb: {
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: '#3B82F6', // Platzhalter Primärfarbe
            position: 'absolute',
            left: 2, // Startposition
            top: 2,
            zIndex: 2,
          },
          sliderText: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#6B7280', // Platzhalter Textfarbe
            zIndex: 1,
          }
        });

        export default SlideToConfirm;
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 3: Grundlegende Slider-Integration in `WorktimeScreen.tsx`**

*   **Ziel:** Ersetzen der alten Buttons durch die (noch nicht funktionale) Slider-Komponente zur Layout-Prüfung.
*   **Datei:** `IntranetMobileApp/src/screens/WorktimeScreen.tsx`
*   **Analyse:** Finde den Bereich, in dem die `handleStartTracking` und `handleStopTracking` Buttons gerendert werden. Dies ist wahrscheinlich innerhalb der `TimeTrackerBox` Komponente oder einer ähnlichen Container-View. Nehmen wir an, es ist direkt in `WorktimeScreen.tsx` (Anpassung nötig, falls es in `TimeTrackerBox` ist). Suche nach `<Button ... onPress={handleStartTracking}>` und `<Button ... onPress={handleStopTracking}>`.
*   **Aktion:**
    1.  Importiere den neuen Slider: `import SlideToConfirm from '../components/SlideToConfirm.tsx';`
    2.  Kommentiere die alten Start/Stop-Buttons aus oder lösche sie.
    3.  Füge an ihrer Stelle den Slider ein:
        ```tsx
        // Annahme: Dieser Code ist im return() von WorktimeScreen, wo die Buttons waren
        <SlideToConfirm
          onConfirm={() => {
            // Temporäre Logik für Test
            console.log('Slider bestätigt');
            // Später: isTimerRunning ? handleStopTracking() : handleStartTracking();
          }}
          isTimerRunning={isTimerRunning}
        />

        {/* Auskommentierte alte Buttons:
        {!isTimerRunning ? (
          <Button onPress={handleStartTracking} disabled={startLoading || isLoading || !selectedBranch}>
            Starten
          </Button>
        ) : (
          <Button onPress={handleStopTracking} disabled={stopLoading || isLoading}>
            Stoppen
          </Button>
        )}
        */}
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 4: Implementierung der Slider-Logik (`SlideToConfirm.tsx`)**

*   **Ziel:** Den Slider funktionsfähig machen.
*   **Datei:** `IntranetMobileApp/src/components/SlideToConfirm.tsx`
*   **Aktion:** Ersetze den Inhalt der Datei durch folgende Implementierung (fügt `react-native-gesture-handler` und `react-native-reanimated` hinzu - letzteres muss evtl. auch installiert werden, falls nicht schon geschehen: `npm i react-native-reanimated` / `yarn add react-native-reanimated` + `pod install`):
    ```typescript
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
         // <GestureHandlerRootView>
            <View style={containerStyle}>
              <PanGestureHandler onGestureEvent={gestureHandler}>
                <Animated.View style={[thumbStyle, animatedThumbStyle]} />
              </PanGestureHandler>
              <Animated.Text style={[textStyle, animatedTextStyle]}>
                {sliderText}
              </Animated.Text>
            </View>
         // </GestureHandlerRootView>
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
        marginVertical: 10,
        alignSelf: 'center', // Zentriert den Slider selbst
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
    ```
*   **Wichtiger Hinweis:** `react-native-reanimated` v2+ benötigt Konfiguration in `babel.config.js`. Stelle sicher, dass `plugins: ['react-native-reanimated/plugin']` vorhanden ist. Eventuell ist ein Cache-Reset (`npm start -- --reset-cache` oder `yarn start --reset-cache`) und Neuinstallation der App nötig.
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 5: Slider-Logik Integration in `WorktimeScreen.tsx`**

*   **Ziel:** Die `onConfirm`-Aktion des Sliders mit der tatsächlichen Start/Stop-Logik verbinden.
*   **Datei:** `IntranetMobileApp/src/screens/WorktimeScreen.tsx`
*   **Analyse:** Finde die `<SlideToConfirm />`-Instanz.
*   **Aktion:** Ändere die `onConfirm`-Prop:
    ```tsx
    // Vorher:
    // onConfirm={() => { console.log('Slider bestätigt'); }}

    // Nachher:
    onConfirm={() => {
      if (isTimerRunning) {
        handleStopTracking();
      } else {
        handleStartTracking();
      }
    }}
    ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 5b: Ersetzen des Sliders durch einen Swipe-Button**

*   **Ziel:** Den implementierten Slider durch einen modernen Swipe-Button ersetzen, der besser dem SBB-Design entspricht und intuitiver ist.
*   **Hintergrund:** Ursprünglich war ein `SlideToConfirm` mit PanResponder geplant, stattdessen wurde ein `SimpleSlider` mit `@react-native-community/slider` implementiert. Dieser soll nun durch einen Swipe-Button ersetzt werden.
*   **Ausgangslage (Aktueller Stand):**
    *   Die aktuelle Implementierung verwendet `SimpleSlider.tsx` statt `SlideToConfirm.tsx`
    *   Der Slider nutzt die externe Abhängigkeit `@react-native-community/slider`
    *   Die `TimeTrackerBox` integriert den `SimpleSlider` und ruft die `handleSliderConfirm`-Funktion auf
    *   Die Timer-Start/Stopp-Logik ist bereits in den Funktionen `handleStartTimerAction` und `handleStopTimerAction` in `WorktimeScreen.tsx` implementiert
*   **Datei-Übersicht:**
    *   Neue Datei: `IntranetMobileApp/src/components/SwipeButton.tsx` (zu erstellen)
    *   Zu ändern: `IntranetMobileApp/src/components/TimeTrackerBox.tsx` (SimpleSlider durch SwipeButton ersetzen)
    *   Zu entfernen: `IntranetMobileApp/src/components/SimpleSlider.tsx` (nach erfolgreicher Migration)
    *   Optional zu aktualisieren: `package.json` (Abhängigkeit `@react-native-community/slider` entfernen, wenn nicht anderweitig benötigt)

#### Teilschritt 5b.1: Erstellen der `SwipeButton`-Komponente

*   **Aktion:**
    1.  Erstelle die Datei `IntranetMobileApp/src/components/SwipeButton.tsx`
    2.  Implementiere folgende `SwipeButton`-Komponente:
        ```typescript
        import React, { useEffect } from 'react';
        import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
        import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
        import Animated, {
          useSharedValue,
          useAnimatedGestureHandler,
          useAnimatedStyle,
          withSpring,
          runOnJS,
        } from 'react-native-reanimated';
        import { MaterialCommunityIcons } from '@expo/vector-icons';

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
          // Position des Thumbs (0 = links, SWIPE_RANGE = rechts)
          const translateX = useSharedValue(0);
          
          // Text, der im Track angezeigt wird
          const swipeText = text ?? (isTimerRunning ? 'Swipe zum Stoppen' : 'Swipe zum Starten');
          
          // Farbe je nach Status (können auch importierte Farben aus Theme sein)
          const dynamicButtonColor = isTimerRunning ? '#F44336' : buttonColor; // Rot für Stop
          
          // Gesten-Handler für den Swipe
          const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number }>({
            onStart: (_, ctx) => {
              ctx.startX = translateX.value;
            },
            onActive: (event, ctx) => {
              let newValue = ctx.startX + event.translationX;
              // Begrenze Bewegung zwischen 0 und SWIPE_RANGE
              translateX.value = Math.max(0, Math.min(newValue, SWIPE_RANGE));
            },
            onEnd: () => {
              // Prüfe, ob Schwellwert erreicht wurde
              if (translateX.value > SWIPE_RANGE * confirmThreshold) {
                // Aktion ausführen
                runOnJS(onSwipeComplete)();
                // Nach kurzer Verzögerung zurückspringen (bessere UX)
                setTimeout(() => {
                  translateX.value = withSpring(0);
                }, 200);
              } else {
                // Sofort zurückspringen, wenn nicht weit genug
                translateX.value = withSpring(0);
              }
            },
          });

          // Animierter Style für den Button
          const thumbStyle = useAnimatedStyle(() => ({
            transform: [{ translateX: translateX.value }],
          }));

          return (
            <View style={[styles.container, { opacity: disabled ? 0.6 : 1 }]}>
              <View style={[styles.track, { backgroundColor: trackColor, height, borderWidth: 1, borderColor: '#D1D5DB' }]}>
                <Text style={[styles.trackText, { color: textColor }]}>
                  {swipeText}
                </Text>
                
                <PanGestureHandler onGestureEvent={gestureHandler} enabled={!disabled}>
                  <Animated.View 
                    style={[
                      styles.thumb, 
                      { backgroundColor: dynamicButtonColor, height: THUMB_SIZE, width: THUMB_SIZE },
                      thumbStyle
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
        ```

*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

#### Teilschritt 5b.2: Integration in `TimeTrackerBox.tsx`

*   **Datei:** `IntranetMobileApp/src/components/TimeTrackerBox.tsx`
*   **Analyse:** Die aktuelle `TimeTrackerBox` verwendet `SimpleSlider`, der durch den neuen `SwipeButton` ersetzt werden soll.
*   **Aktion:**
    1.  Ändere den Import von `SimpleSlider` zu `SwipeButton`:
        ```typescript
        // Alt (entfernen):
        import SimpleSlider from './SimpleSlider';
        
        // Neu (hinzufügen):
        import SwipeButton from './SwipeButton';
        ```
    2.  Ersetze die `SimpleSlider`-Komponente im JSX:
        ```tsx
        {/* Alt (entfernen): */}
        <SimpleSlider 
          onConfirm={handleSliderConfirm}
          isTimerRunning={!!currentWorkTime}
          text={currentWorkTime ? "Zum Stoppen ziehen" : "Zum Starten ziehen"}
          disabled={isLoading || startLoading || stopLoading || branches.length === 0}
        />

        {/* Neu (hinzufügen): */}
        <SwipeButton 
          onSwipeComplete={handleSliderConfirm}
          isTimerRunning={!!currentWorkTime}
          text={currentWorkTime ? "Zum Stoppen ziehen" : "Zum Starten ziehen"}
          disabled={isLoading || startLoading || stopLoading || branches.length === 0}
        />
        ```
    3.  Stelle sicher, dass das `controlsContainer` Layout in den Styles weiterhin korrekt für den neuen `SwipeButton` passt:
        ```typescript
        controlsContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 8,
        },
        ```

*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

#### Teilschritt 5b.3: Saubere Entfernung des Sliders und seiner Abhängigkeiten

*   **Ziel:** Nach erfolgreicher Integration des Swipe-Buttons alle Überreste des alten Sliders entfernen, um die Codebasis sauber zu halten.
*   **Aktion:**
    1.  Stelle sicher, dass der `SwipeButton` vollständig funktioniert und keine Fehler auftreten.
    2.  Überprüfe, ob `SimpleSlider.tsx` noch anderweitig verwendet wird:
        ```bash
        # Terminal-Befehl zum Suchen aller Vorkommen
        grep -r "SimpleSlider" --include="*.tsx" --include="*.ts" ./IntranetMobileApp/src
        ```
    3.  Wenn keine weitere Verwendung besteht:
        *   Lösche die Datei `IntranetMobileApp/src/components/SimpleSlider.tsx`
    4.  Überprüfe, ob `@react-native-community/slider` noch anderweitig verwendet wird:
        ```bash
        # Terminal-Befehl zum Suchen aller Vorkommen
        grep -r "@react-native-community/slider" --include="*.tsx" --include="*.ts" ./IntranetMobileApp/src
        ```
    5.  Wenn keine weitere Verwendung besteht:
        *   Entferne die Abhängigkeit aus `package.json`: 
            ```bash
            # NPM
            npm uninstall @react-native-community/slider
            # oder Yarn
            yarn remove @react-native-community/slider
            ```

*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 6: "Zeiteinträge"-Button zu `IconButton` ändern**

*   **Ziel:** Den Text-Button für die Anzeige der Arbeitszeitliste durch einen Icon-Button ersetzen.
*   **Datei:** `IntranetMobileApp/src/screens/WorktimeScreen.tsx` (oder `TimeTrackerBox.tsx`, falls der Button dort ist)
*   **Analyse:** Finde den Button, der `setShowWorkTimeListModal(true)` aufruft. Beispielhaft nehmen wir an, er sieht so aus: `<Button onPress={() => setShowWorkTimeListModal(true)}>Zeiteinträge</Button>`.
*   **Aktion:**
    1.  Importiere `IconButton` von `react-native-paper`, falls noch nicht geschehen.
    2.  Ersetze den `<Button>` durch:
        ```tsx
        <IconButton
          icon="history" // MaterialCommunityIcons Name
          size={24} // Passende Grösse wählen
          onPress={() => setShowWorkTimeListModal(true)}
          accessibilityLabel="Zeiteinträge anzeigen" // Wichtig für Barrierefreiheit
        />
        ```
    3.  Platziere diesen `IconButton` logisch im Layout, z.B. in einer `View` neben dem Slider oder in der Kopfzeile der Zeiterfassungs-Box.
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 7: Filter & Neu Buttons zu `IconButton` ändern (Taskliste)**

*   **Ziel:** Buttons in der Taskliste (Filter, Neu) durch Icon-Buttons ersetzen.
*   **Datei:** `IntranetMobileApp/src/screens/WorktimeScreen.tsx` (im Bereich, wo die Taskliste und ihre Controls gerendert werden)
*   **Analyse:** Finde die Buttons für "Filter" (öffnet `TaskFilterModal`) und "Neu" (öffnet `TaskDetailModal` im `CREATE`-Modus).
*   **Aktion:**
    1.  Importiere `IconButton`, falls noch nicht geschehen.
    2.  Ersetze den Filter-Button (angenommen `<Button onPress={() => setShowTaskFilterModal(true)}>Filter</Button>`) durch:
        ```tsx
        <IconButton
          icon="filter-variant"
          size={24}
          onPress={() => setShowTaskFilterModal(true)} // Sicherstellen, dass Modal-Steuerung korrekt ist
          accessibilityLabel="Tasks filtern"
        />
        ```
    3.  Ersetze den Neu-Button (angenommen `<Button onPress={handleOpenCreateTaskModal}>Neu</Button>`, wobei `handleOpenCreateTaskModal` die Logik zum Öffnen des Detail-Modals im Create-Mode enthält) durch:
        ```tsx
        <IconButton
          icon="plus-circle-outline"
          size={24}
          onPress={handleOpenCreateTaskModal} // Oder die entsprechende Handler-Funktion direkt
          accessibilityLabel="Neue Aufgabe erstellen"
        />
        ```
    4.  Ordne diese Buttons logisch an, z.B. in einer Reihe in der Kopfzeile der Taskliste.
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 8: TaskList Item Styling (Card Struktur)**

*   **Ziel:** Jeden Task in der Liste mit einer `react-native-paper` Card umschliessen.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Finde die Komponente oder den JSX-Block, der einen einzelnen Task rendert (oft eine `View` oder `TouchableOpacity`).
*   **Aktion:**
    1.  Importiere `Card` von `react-native-paper`.
    2.  Umschliesse den bisherigen Task-Item-Block mit `<Card>` und `<Card.Content>`.
        ```tsx
        // Beispiel: Mapping über Tasks
        tasks.map((task) => (
          <Card
            key={task.id}
            style={styles.taskCard}
            onPress={() => handleOpenTaskDetail(task.id)} // Falls das ganze Item klickbar sein soll
          >
            <Card.Content>
              {/* --- HIER der bisherige Inhalt des Task-Items --- */}
              <Text style={styles.taskTitle}>{task.title}</Text>
              {/* Weitere Task-Details... */}
              {/* --- Ende bisheriger Inhalt --- */}
            </Card.Content>
          </Card>
        ))

        // Dazugehörige Styles (Beispiel, anpassen an DESIGN_STANDARDS.md)
        const styles = StyleSheet.create({
          // ... andere Styles
          taskCard: {
            marginVertical: 4,
            marginHorizontal: 8,
            backgroundColor: '#FFFFFF', // Weiss
            borderRadius: 8, // Abgerundet
            elevation: 2, // Leichter Schatten
          },
          taskTitle: {
             // Beispiel Styling
             fontSize: 16, // base
             fontWeight: '600', // semibold
             color: '#111827', // Schwarz
             marginBottom: 4,
          },
          // ... weitere Styles für Task-Details
        });
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 9: TaskList Item Styling (Status Visualisierung)**

*   **Ziel:** Den Text-Status durch einen `Chip` oder ein `Icon` ersetzen.
*   **Datei:** Wo das einzelne Task-Item gerendert wird.
*   **Analyse:** Finde die Stelle, wo `task.status` als Text angezeigt wird.
*   **Aktion:**
    1.  Importiere `Chip` von `react-native-paper`.
    2.  Erstelle eine Helper-Funktion oder Logik, um Farbe/Icon basierend auf dem Status zu bestimmen (gemäss `DESIGN_STANDARDS.md`).
    3.  Ersetze die Textanzeige des Status durch den `Chip`:
        ```tsx
        // Helper Funktion (Beispiel) - HIER MÜSSEN TaskStatus importiert werden
        // import { TaskStatus } from '../types'; // Pfad anpassen!
        const getStatusStyle = (status: TaskStatus) => {
          switch (status) {
            case TaskStatus.OPEN: return { icon: 'circle-outline', color: '#6B7280' }; // Grau
            case TaskStatus.IN_PROGRESS: return { icon: 'progress-wrench', color: '#3B82F6' }; // Blau
            case TaskStatus.IMPROVAL: return { icon: 'alert-circle-outline', color: '#F59E0B' }; // Gelb/Orange
            case TaskStatus.QUALITY_CONTROL: return { icon: 'check-decagram-outline', color: '#8B5CF6' }; // Violett (Beispiel)
            case TaskStatus.DONE: return { icon: 'check-circle-outline', color: '#10B981' }; // Grün
            default: return { icon: 'help-circle-outline', color: '#6B7280' };
          }
        };

        // Im Task-Item Rendering (innerhalb der Card.Content)
        const statusStyle = getStatusStyle(task.status);
        <View style={styles.statusContainer}> // Für Layout
           <Chip
             icon={statusStyle.icon}
             textStyle={{ color: statusStyle.color }}
             style={[styles.statusChip, { borderColor: statusStyle.color }]} // Optionaler Rahmen
             // mode="outlined" // Alternative Darstellung
           >
             {task.status} {/* Oder übersetzter Status */}
           </Chip>
        </View>

        // Beispiel-Styles
        const styles = StyleSheet.create({
           // ...
           statusContainer: {
             marginTop: 8,
             alignItems: 'flex-start', // Chip nicht auf voller Breite
           },
           statusChip: {
             backgroundColor: '#F9FAFB', // Hellgrau
             // borderColor: ... // Wird dynamisch gesetzt
             // borderWidth: 1, // Falls outlined gewünscht
           }
        });
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 10: TaskList Item Styling (Typografie & Layout)**

*   **Ziel:** Finale Anpassung von Schriftarten, Grössen, Farben und Abständen innerhalb der Task-Cards.
*   **Datei:** Wo das einzelne Task-Item gerendert wird.
*   **Analyse:** Überprüfe alle `Text`-Komponenten und `View`-Container innerhalb der `Card.Content`.
*   **Aktion:** Passe die `style`-Props aller Elemente an die Vorgaben aus `DESIGN_STANDARDS.md` an (Schriftgrössen `sm`, `base`, `lg`; Schriftstärken `normal`, `medium`, `semibold`; Farben `Primärtext`, `Sekundärtext`; Abstände `margin`, `padding`).
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 11: Modal Styling vereinheitlichen**

*   **Ziel:** Sicherstellen, dass alle relevanten Modals (`WorktimeListModal`, `TaskDetailModal`, `TaskFilterModal`) ein konsistentes, modernes Aussehen haben.
*   **Dateien:** `IntranetMobileApp/src/components/WorktimeListModal.tsx`, `IntranetMobileApp/src/components/TaskDetailModal.tsx`, `IntranetMobileApp/src/components/TaskFilterModal.tsx` (und ggf. weitere).
*   **Analyse:** Überprüfe die Struktur und das Styling der Hauptcontainer (`Modal`-Komponente von `react-native-paper` oder eine umschliessende `View`) in jeder Modal-Datei.
*   **Aktion:**
    1.  Stelle sicher, dass `Modal` von `react-native-paper` verwendet wird.
    2.  Wende konsistentes Styling auf die `contentContainerStyle`-Prop des `Modal` an:
        ```jsx
        <Modal
          visible={visible}
          onDismiss={hideModal}
          contentContainerStyle={styles.modalContainer} // Style hier anwenden
        >
          {/* Modal Inhalt */}
        </Modal>

        // Beispiel Style
        const styles = StyleSheet.create({
          modalContainer: {
            backgroundColor: 'white', // Oder Dark Mode Farbe
            padding: 20,
            margin: 20, // Abstand zum Rand
            borderRadius: 8, // Abrundung
            elevation: 5, // Schatten für Modal
          },
          // ... weitere Styles für Inhalt
        });
        ```
    3.  Überprüfe und vereinheitliche das Styling der Elemente *innerhalb* der Modals (Titel, TextInputs, Buttons) gemäss `DESIGN_STANDARDS.md`.
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 12: Allgemeines Screen Styling (`WorktimeScreen.tsx`)**

*   **Ziel:** Sicherstellen, dass der gesamte Bildschirmhintergrund, die Abstände und die `SafeArea` korrekt sind.
*   **Datei:** `IntranetMobileApp/src/screens/WorktimeScreen.tsx`
*   **Analyse:** Überprüfe die äusserste(n) Container-Komponente(n) (`SafeAreaView`, `ScrollView`, `View`).
*   **Aktion:**
    1.  Stelle sicher, dass `SafeAreaView` die Hauptinhalte umschliesst, die nicht von der System-UI verdeckt werden sollen.
    2.  Setze eine passende Hintergrundfarbe für den gesamten Screen (z.B. `backgroundColor: '#F9FAFB'` für Hellgrau aus `DESIGN_STANDARDS.md`) auf die äusserste `View` oder `ScrollView`.
    3.  Überprüfe globale Paddings/Margins für den Screen-Inhalt.
    4.  Prüfe, ob ein `PaperProvider` mit einem Theme verwendet wird (typischerweise in `App.tsx`). Falls ja, stelle sicher, dass das Theme die Farben/Schriften aus `DESIGN_STANDARDS.md` korrekt definiert.
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 13: App Icon Update (Standard)**

*   **Ziel:** Das Standard-App-Icon durch das neue, bereitgestellte Icon ersetzen.
*   **Analyse (Bereits durchgeführt):**
    *   Android: Icons in `IntranetMobileApp/android/app/src/main/res/mipmap-*`, Referenz in `AndroidManifest.xml`.
    *   iOS: Icons in `IntranetMobileApp/ios/IntranetMobileApp/Images.xcassets/AppIcon.appiconset`.
*   **Aktion (Manuell durch DICH, den Benutzer):**
    1.  **Skalieren:** Erstelle alle benötigten Grössen des neuen Icons für Android (`ic_launcher.png`, `ic_launcher_round.png` in `mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) und iOS (siehe `AppIcon.appiconset/Contents.json` für die genauen Grössen).
    2.  **Ersetzen (Android):** Ersetze die vorhandenen `.png`-Dateien in allen `mipmap-*`-Ordnern durch deine neuen Dateien.
    3.  **Ersetzen (iOS):** Ersetze die vorhandenen `.png`-Dateien im `AppIcon.appiconset`-Ordner durch deine neuen Dateien.
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Schritt 14: Korrektur des On/Off Swipe-Buttons**

*   **Ziel:** Anpassung des Designs des Swipe-Buttons gemäß den Vorgaben.
*   **Datei:** `IntranetMobileApp/src/components/SwipeButton.tsx`
*   **Analyse:** Der aktuelle Button verwendet einen schwarzen Hintergrund und muss auf weiß mit grauem Rahmen geändert werden.
*   **Aktion:**
    1.  Ändere die Standardfarben in der `SwipeButton`-Komponente:
        ```typescript
        trackColor = '#FFFFFF', // Weiß statt dunkelgrau
        textColor = '#374151', // Dunkelgrau für Text
        ```
    2.  Füge einen grauen Rahmen zum Track hinzu:
        ```typescript
        track: {
          // ... existing code ...
          borderWidth: 1,
          borderColor: '#D1D5DB', // Grauer Rahmen
        }
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 15: Korrektur der Swipe-Richtung**

*   **Ziel:** Anpassung der Swipe-Logik, sodass bei aktivem Timer der Knopf rechts ist und nach links gewischt werden muss.
*   **Datei:** `IntranetMobileApp/src/components/SwipeButton.tsx`
*   **Analyse:** Aktuell ist der Knopf immer links und muss nach rechts gewischt werden.
*   **Aktion:**
    1.  Ändere die Position des Thumbs basierend auf `isTimerRunning`:
        ```typescript
        const initialPosition = isTimerRunning ? SWIPE_RANGE : 0;
        const [translateX] = useState(new Animated.Value(initialPosition));
        ```
    2.  Passe die Swipe-Logik an:
        ```typescript
        const handleGestureEvent = (event: any) => {
          const { translationX } = event.nativeEvent;
          const newPosition = isTimerRunning
            ? Math.max(0, Math.min(initialPosition + translationX, SWIPE_RANGE))
            : Math.max(0, Math.min(translationX, SWIPE_RANGE));
          translateX.setValue(newPosition);
        };

        const handleHandlerStateChange = (event: any) => {
          if (event.nativeEvent.state === State.END) {
            const { translationX } = event.nativeEvent;
            const threshold = SWIPE_RANGE * confirmThreshold;
            
            if (isTimerRunning) {
              // Wenn Timer läuft: Nach links wischen zum Stoppen
              if (translationX < -threshold) {
                onSwipeComplete();
                setTimeout(() => {
                  Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                  }).start();
                }, 200);
              } else {
                // Zurück nach rechts
                Animated.spring(translateX, {
                  toValue: SWIPE_RANGE,
                  useNativeDriver: true,
                }).start();
              }
            } else {
              // Wenn Timer gestoppt: Nach rechts wischen zum Starten
              if (translationX > threshold) {
                onSwipeComplete();
                setTimeout(() => {
                  Animated.spring(translateX, {
                    toValue: SWIPE_RANGE,
                    useNativeDriver: true,
                  }).start();
                }, 200);
              } else {
                // Zurück nach links
                Animated.spring(translateX, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start();
              }
            }
          }
        };
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 16: Korrektur des Zeiterfassungseinträge-Icons**

*   **Ziel:** Anpassung des Icons für die Anzeige der Zeiterfassungseinträge gemäß Frontend.
*   **Datei:** `IntranetMobileApp/src/components/TimeTrackerBox.tsx`
*   **Analyse:** Das aktuelle Icon muss durch das gleiche Icon wie im Frontend ersetzt werden.
*   **Aktion:**
    1.  Ändere das Icon in der `TimeTrackerBox`-Komponente:
        ```typescript
        <IconButton
          icon="format-list-bulleted" // Gleiches Icon wie im Frontend
          size={24}
          onPress={onShowWorkTimeList}
          disabled={isLoading}
          accessibilityLabel="Zeiteinträge anzeigen"
          style={styles.historyButton}
        />
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 17: Korrektur der Icon-Positionierung**

*   **Ziel:** Neuanordnung der Icons für Filter, Spalten konfigurieren und Neuer Task gemäß Dokumentation.
*   **Datei:** `IntranetMobileApp/src/screens/WorktimeScreen.tsx`
*   **Analyse:** Die Icons sind aktuell falsch positioniert und müssen neu angeordnet werden.
*   **Aktion:**
    1.  Erstelle einen neuen Container für die Buttons:
        ```typescript
        const styles = StyleSheet.create({
          // ... existing code ...
          headerContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            marginBottom: 16,
          },
          leftButtons: {
            flexDirection: 'row',
            alignItems: 'center',
          },
          rightButtons: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        });
        ```
    2.  Ordne die Buttons neu an:
        ```typescript
        <View style={styles.headerContainer}>
          <View style={styles.leftButtons}>
            <IconButton
              icon="plus"
              size={24}
              onPress={() => {
                setModalMode(ModalMode.CREATE);
                setModalTaskId(null);
                setShowTaskDetailModal(true);
              }}
              accessibilityLabel="Neuen Task erstellen"
            />
          </View>
          
          <View style={styles.rightButtons}>
            <IconButton
              icon="filter-variant"
              size={24}
              onPress={() => setShowFilterModal(true)}
              accessibilityLabel="Filter öffnen"
            />
            <IconButton
              icon="cog"
              size={24}
              onPress={() => setShowTableSettingsModal(true)}
              accessibilityLabel="Spalten konfigurieren"
            />
          </View>
        </View>
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 18: Integration des Suchfelds**

*   **Ziel:** Verschieben des Suchfelds in die gleiche Zeile wie die Buttons.
*   **Datei:** `IntranetMobileApp/src/screens/WorktimeScreen.tsx`
*   **Analyse:** Das Suchfeld muss zwischen dem "Neuer Task"-Button und den Filter/Spalten-Buttons platziert werden.
*   **Aktion:**
    1.  Erweitere die Styles:
        ```typescript
        const styles = StyleSheet.create({
          // ... existing code ...
          searchContainer: {
            flex: 1,
            marginHorizontal: 16,
          },
          searchInput: {
            height: 40,
            backgroundColor: '#F3F4F6',
            borderRadius: 8,
            paddingHorizontal: 12,
          },
        });
        ```
    2.  Füge das Suchfeld in den Header ein:
        ```typescript
        <View style={styles.headerContainer}>
          <View style={styles.leftButtons}>
            <IconButton
              icon="plus"
              size={24}
              onPress={() => {
                setModalMode(ModalMode.CREATE);
                setModalTaskId(null);
                setShowTaskDetailModal(true);
              }}
              accessibilityLabel="Neuen Task erstellen"
            />
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Suchen..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.rightButtons}>
            <IconButton
              icon="filter-variant"
              size={24}
              onPress={() => setShowFilterModal(true)}
              accessibilityLabel="Filter öffnen"
            />
            <IconButton
              icon="cog"
              size={24}
              onPress={() => setShowTableSettingsModal(true)}
              accessibilityLabel="Spalten konfigurieren"
            />
          </View>
        </View>
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 19: Korrektur des Task-Card-Designs**

*   **Ziel:** Verbesserung des Designs der Task-Cards gemäß den Vorgaben.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Die Task-Cards müssen breiter sein und das Layout muss angepasst werden.
*   **Aktion:**
    1.  Passe die Styles der Task-Cards an:
        ```typescript
        const styles = StyleSheet.create({
          // ... existing code ...
          taskCard: {
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 8,
          },
          cardContent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
          },
          mainContent: {
            flex: 0.8,
          },
          sideContent: {
            flex: 0.2,
            alignItems: 'flex-end',
          },
          title: {
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 4,
          },
          description: {
            fontSize: 14,
            color: '#6B7280',
          },
          status: {
            marginBottom: 4,
          },
          dueDate: {
            fontSize: 12,
            color: '#6B7280',
          },
        });
        ```
    2.  Aktualisiere das Layout der Task-Cards:
        ```typescript
        <Card style={styles.taskCard} mode="outlined">
          <Card.Content>
            <View style={styles.cardContent}>
              <View style={styles.mainContent}>
                <Text style={styles.title}>{task.title}</Text>
                <Text style={styles.description} numberOfLines={2}>
                  {task.description}
                </Text>
              </View>
              
              <View style={styles.sideContent}>
                <Chip style={styles.status} textStyle={{ color: 'white' }} mode="flat">
                  {getStatusText(task.status)}
                </Chip>
                <Text style={styles.dueDate}>
                  {task.dueDate ? formatDate(task.dueDate) : '-'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 20: Integration der gespeicherten Filter**

*   **Ziel:** Anzeige der gespeicherten Filter analog zum Frontend.
*   **Datei:** `IntranetMobileApp/src/screens/WorktimeScreen.tsx`
*   **Analyse:** Die gespeicherten Filter müssen aus dem Modal in die Hauptansicht verschoben werden.
*   **Aktion:**
    1.  Füge die Styles für die Filter-Chips hinzu:
        ```typescript
        const styles = StyleSheet.create({
          // ... existing code ...
          filterChipsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            paddingHorizontal: 16,
            marginBottom: 16,
            gap: 8,
          },
          filterChip: {
            backgroundColor: '#F3F4F6',
          },
          activeFilterChip: {
            backgroundColor: '#3B82F6',
          },
        });
        ```
    2.  Füge die Filter-Chips unter dem Header ein:
        ```typescript
        <View style={styles.filterChipsContainer}>
          <Chip
            selected={activeFilter === 'all'}
            onPress={() => handleFilterSelect('all')}
            style={[
              styles.filterChip,
              activeFilter === 'all' && styles.activeFilterChip
            ]}
          >
            Alle
          </Chip>
          <Chip
            selected={activeFilter === 'archive'}
            onPress={() => handleFilterSelect('archive')}
            style={[
              styles.filterChip,
              activeFilter === 'archive' && styles.activeFilterChip
            ]}
          >
            Archiv
          </Chip>
          {savedFilters.map((filter) => (
            <Chip
              key={filter.id}
              selected={activeFilter === filter.id}
              onPress={() => handleFilterSelect(filter.id)}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.activeFilterChip
              ]}
            >
              {filter.name}
            </Chip>
          ))}
          {activeFilter !== 'all' && (
            <Chip
              icon="close"
              onPress={resetFilters}
              style={styles.resetFilterChip}
            >
              Zurücksetzen
            </Chip>
          )}
        </View>
        ```
    3.  Implementiere die Filter-Logik:
        ```typescript
        const [activeFilter, setActiveFilter] = useState('all');
        
        useEffect(() => {
          // Setze den Standard-Filter beim Laden
          setActiveFilter('my');
        }, []);
        
        const filteredTasks = useMemo(() => {
          switch (activeFilter) {
            case 'my':
              return tasks.filter(task => task.assignedTo?.id === user?.id);
            case 'open':
              return tasks.filter(task => task.status === 'open');
            default:
              return tasks;
          }
        }, [tasks, activeFilter, user]);
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 21: Korrektur des Filter-Icons**

*   **Ziel:** Angleichung des Filter-Icons an das Frontend.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Das aktuelle Filter-Icon muss mit dem Frontend-Icon verglichen und angepasst werden.
*   **Aktion:**
    1.  Frontend-Icon analysieren und exakten Namen identifizieren
    2.  Icon in der TaskList-Komponente aktualisieren:
        ```typescript
        <IconButton
          icon="filter-outline" // Wird mit korrektem Icon-Namen aus Frontend ersetzt
          size={24}
          onPress={() => setShowFilterModal(true)}
          accessibilityLabel="Filter öffnen"
        />
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 22: Korrektur des Spalten-Konfigurations-Icons**

*   **Ziel:** Angleichung des Spalten-Konfigurations-Icons an das Frontend.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Das aktuelle Spalten-Konfigurations-Icon muss mit dem Frontend-Icon verglichen und angepasst werden.
*   **Aktion:**
    1.  Frontend-Icon analysieren und exakten Namen identifizieren
    2.  Icon in der TaskList-Komponente aktualisieren:
        ```typescript
        <IconButton
          icon="table-column" // Wird mit korrektem Icon-Namen aus Frontend ersetzt
          size={24}
          onPress={() => setShowTableSettingsModal(true)}
          accessibilityLabel="Spalten konfigurieren"
        />
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 23: Entfernung des Card-Hintergrunds**

*   **Ziel:** Entfernung des grauen Hintergrunds und Rands hinter den Cards.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Der graue Hintergrund und Rand der Container-View muss entfernt werden.
*   **Aktion:**
    1.  Styles der Container-View anpassen:
        ```typescript
        const styles = StyleSheet.create({
          container: {
            flex: 1,
            // Entferne backgroundColor und borderWidth/Color
          },
          // ... andere Styles
        });
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 24: Anpassung der Card-Breite**

*   **Ziel:** Verbreiterung der Cards auf volle Komponenten-Breite.
*   **Datei:** `IntranetMobileApp/src/components/TaskCard.tsx`
*   **Analyse:** Die Cards müssen die volle Breite der To-Do-Liste ausnutzen.
*   **Aktion:**
    1.  Styles der Card und des Containers anpassen:
        ```typescript
        const styles = StyleSheet.create({
          card: {
            width: '100%',
            marginHorizontal: 0, // Entferne seitliche Margins
            borderRadius: 8,
          },
          container: {
            width: '100%',
            paddingHorizontal: 0, // Entferne seitliches Padding
          },
          // ... andere Styles
        });
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 25: Verschiebung des "Neue Aufgabe"-Buttons**

*   **Ziel:** Umwandlung in einen schwebenden Action Button (FAB).
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Der "Neue Aufgabe"-Button muss aus der Header-Zeile entfernt und als FAB implementiert werden.
*   **Aktion:**
    1.  Button aus dem Header entfernen
    2.  FAB am unteren rechten Rand implementieren:
        ```typescript
        import { FAB } from 'react-native-paper';

        // Im JSX, nach der TaskList:
        <FAB
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            backgroundColor: '#3B82F6', // Primärfarbe
          }}
          icon="plus"
          onPress={() => {
            setModalMode(ModalMode.CREATE);
            setModalTaskId(null);
            setShowTaskDetailModal(true);
          }}
        />
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 26: Verschiebung des To-Do-Liste-Titels**

*   **Ziel:** Integration des Titels in die Zeile mit Suchfeld und Buttons.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Der Titel muss in die Header-Zeile verschoben werden.
*   **Aktion:**
    1.  Titel in den Header-Container verschieben:
        ```typescript
        <View style={styles.headerContainer}>
          <Text style={styles.title}>To-Do-Liste</Text>
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Suchen..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.rightButtons}>
            {/* ... Filter & Spalten Buttons ... */}
          </View>
        </View>
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 27: Optimierung der Icon-Buttons**

*   **Ziel:** Verkleinerung und engere Platzierung der Filter- und Spalten-Icons.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Die Icons müssen kleiner werden und enger zusammenrücken.
*   **Aktion:**
    1.  Icon-Größe und Abstände anpassen:
        ```typescript
        <View style={styles.rightButtons}>
          <IconButton
            icon="filter-variant"
            size={20} // Kleiner
            style={styles.iconButton}
            onPress={() => setShowFilterModal(true)}
          />
          <IconButton
            icon="table-column"
            size={20} // Kleiner
            style={styles.iconButton}
            onPress={() => setShowTableSettingsModal(true)}
          />
        </View>

        const styles = StyleSheet.create({
          rightButtons: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4, // Engerer Abstand
          },
          iconButton: {
            margin: 0, // Entferne Standard-Margins
          },
          // ... andere Styles
        });
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 28: Timer-Text-Optimierung**

*   **Ziel:** Timer-Text in eine Zeile bringen.
*   **Datei:** `IntranetMobileApp/src/components/TimeTrackerBox.tsx`
*   **Analyse:** Der Timer-Text muss in einer Zeile angezeigt werden.
*   **Aktion:**
    1.  Layout des Timer-Texts anpassen:
        ```typescript
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            Timer läuft seit {formattedDuration} {branchName}
          </Text>
        </View>

        const styles = StyleSheet.create({
          timerContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          },
          timerText: {
            fontSize: 16,
            color: '#374151',
            textAlign: 'center',
          },
          // ... andere Styles
        });
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 29: Entfernung des Swipe-Button-Schatten-Effekts**

*   **Ziel:** Entfernung des sechseckigen Schatten-Effekts während des Ladens.
*   **Datei:** `IntranetMobileApp/src/components/SwipeButton.tsx`
*   **Analyse:** Der Schatten-Effekt muss während der Lade-Animation entfernt werden.
*   **Aktion:**
    1.  Styles und Animation des Buttons anpassen:
        ```typescript
        const thumbStyle = useAnimatedStyle(() => ({
          transform: [{ translateX: translateX.value }],
          // Entferne shadow-bezogene Styles während der Animation
        }));

        const styles = StyleSheet.create({
          thumb: {
            // ... andere Styles
            // Entferne oder modifiziere shadow-bezogene Properties
            elevation: 0,
            shadowOpacity: 0,
          },
        });
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 30: Korrektur der gespeicherten Filter**

*   **Ziel:** Korrekte Positionierung und Standardfilter entsprechend dem Frontend.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** In Schritt 20 wurden bereits Filter integriert, aber sie erscheinen nicht an der richtigen Position und die Standardfilter ("Alle" und "Archiv") fehlen. Zudem ist kein Filter standardmäßig aktiviert.
*   **Aktion:**
    1.  Korrektur der Position der Filter (UNTER der Suchzeile, ÜBER den Cards):
        ```typescript
        // Nach dem Header-Container und VOR der Card-Liste:
        <View style={styles.headerContainer}>
          {/* ... Suchfeld und Buttons ... */}
        </View>
            
        {/* Hier die Filter-Chips einfügen */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          <Chip
            selected={activeFilter === 'all'}
            onPress={() => handleFilterSelect('all')}
            style={[
              styles.filterChip,
              activeFilter === 'all' && styles.activeFilterChip
            ]}
          >
            Alle
          </Chip>
          <Chip
            selected={activeFilter === 'archive'}
            onPress={() => handleFilterSelect('archive')}
            style={[
              styles.filterChip,
              activeFilter === 'archive' && styles.activeFilterChip
            ]}
          >
            Archiv
          </Chip>
          {savedFilters.map((filter) => (
            <Chip
              key={filter.id}
              selected={activeFilter === filter.id}
              onPress={() => handleFilterSelect(filter.id)}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.activeFilterChip
              ]}
            >
              {filter.name}
            </Chip>
          ))}
          {activeFilter !== 'all' && (
            <Chip
              icon="close"
              onPress={resetFilters}
              style={styles.resetFilterChip}
            >
              Zurücksetzen
            </Chip>
          )}
        </ScrollView>
            
        {/* Task-List */}
        ```
    2.  Standardmäßigen Filter aktivieren:
        ```typescript
        // In useEffect oder direkt bei der State-Initialisierung
        const [activeFilter, setActiveFilter] = useState('all');
        
        // Filter-Handler-Funktion
        const handleFilterSelect = (filterId) => {
          setActiveFilter(filterId);
          // Logik zur Anwendung des Filters
          if (filterId === 'all') {
            // Alle Tasks anzeigen (keine Filterung)
            // ...
          } else if (filterId === 'archive') {
            // Nur archivierte Tasks anzeigen
            // ...
          } else {
            // Gespeicherten Filter anwenden
            const filter = savedFilters.find(f => f.id === filterId);
            if (filter) {
              // Filter anwenden
              // ...
            }
          }
        };
        
        // Filter zurücksetzen
        const resetFilters = () => {
          setActiveFilter('all');
          // Weitere Reset-Logik
          // ...
        };
        ```
    3.  Styles für die Filter-Container anpassen:
        ```typescript
        const styles = StyleSheet.create({
          // ... existierende Styles
          filtersContainer: {
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            gap: 8,
          },
          filterChip: {
            backgroundColor: '#F3F4F6',
          },
          activeFilterChip: {
            backgroundColor: '#3B82F6',
          },
          resetFilterChip: {
            backgroundColor: '#EF4444', // Rot für Reset
          },
        });
        ```
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.** 

**Schritt 31: Entfernung des doppelten To-Do-Liste-Titels**

*   **Ziel:** Entfernung des doppelten "To-Do-Liste"-Titels.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Aktuell erscheint der "To-Do-Liste"-Titel zweimal - einmal in der Zeile mit dem Suchfilter und einmal darunter. Der erste (oberste) Titel muss entfernt werden, während der zweite bestehen bleiben soll.
*   **Aktion:**
    1.  Exakte Lokalisierung des doppelten Titels im Code
    2.  Entfernung des ersten (oberen) Titels, während der zweite bestehen bleibt
    3.  Sicherstellen, dass das Layout trotz der Entfernung korrekt bleibt
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 32: Wiederherstellung des Filter-Icons**

*   **Ziel:** Das verschwundene Filter-Icon wieder hinzufügen.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx`
*   **Analyse:** Seit Schritt 30 ist das Filter-Icon verschwunden. Die gespeicherten Filter werden korrekt angezeigt, aber der Filter-Button für das Modal muss ebenfalls wieder angezeigt werden.
*   **Aktion:**
    1.  Überprüfen, in welchem Code-Block das Filter-Icon entfernt wurde
    2.  Wiederherstellung des Filter-Icons an der ursprünglichen Position
    3.  Sicherstellen, dass beide Konzepte (gespeicherte Filter-Chips und Filter-Icon für das Modal) parallel existieren
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 33: Reduzierung der Card-Höhe**

*   **Ziel:** Verringerung der Höhe der Task-Cards.
*   **Datei:** `IntranetMobileApp/src/components/TaskCard.tsx`
*   **Analyse:** Die Cards werden zu hoch dargestellt, obwohl bereits verschiedene Maßnahmen ergriffen wurden. Weitere Anpassungen sind nötig, um die Höhe zu reduzieren.
*   **Aktion:**
    1.  Reduzierung aller Abstände innerhalb der Cards, besonders zwischen den Zeilen
    2.  Verringerung der Höhe der farbigen Hintergründe für die Status-Anzeige
    3.  Optimierung aller Paddings und Margins, die zur Gesamthöhe beitragen
    4.  Überprüfung der Schriftgrößen und ggf. Anpassung, wo sinnvoll
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 34: Korrektur des Textes im TimeTracker**

*   **Ziel:** Anzeige der drei Timer-Texte in einer Zeile.
*   **Datei:** `IntranetMobileApp/src/components/TimeTrackerBox.tsx`
*   **Analyse:** Die drei Textelemente im Timer-Bereich ("Timer läuft seit...", der Zähler und die Niederlassung) werden aktuell untereinander angezeigt. Sie müssen in einer Zeile nebeneinander angeordnet werden.
*   **Aktion:**
    1.  Überprüfung der bereits vorgenommenen Änderungen aus Schritt 28
    2.  Anpassung des Layouts, um alle drei Textelemente in einer Zeile anzuzeigen
    3.  Implementierung eines flexiblen Row-Layouts mit passenden Abständen
    4.  Bei Bedarf: Anpassung der Schriftgröße oder Implementierung von Ellipsis (...)
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 35: Zentrierter Text im Swiper**

*   **Ziel:** Korrektur der Textposition im Swipe-Button.
*   **Datei:** `IntranetMobileApp/src/components/SwipeButton.tsx`
*   **Analyse:** Der Text "Zum Stoppen ziehen" ist zu weit rechts platziert und dadurch zu nah am roten Stop-Thumb. Er sollte innerhalb des Swipe-Tracks zentriert sein.
*   **Aktion:**
    1.  Anpassung des Track-Layouts für eine zentrierte Textposition
    2.  Entfernung jeglicher Verschiebung des Textes Richtung Thumb
    3.  Implementierung einer flexiblen Zentrierung, die unabhängig vom Thumb-Status funktioniert
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

**Schritt 36: App-Icon-Korrektur**

*   **Ziel:** Wiederherstellung des korrekten App-Icons.
*   **Datei:** Android-Manifest und zugehörige Ressourcen-Dateien
*   **Analyse:** Das App-Icon wird nicht mehr korrekt angezeigt, stattdessen erscheint das Android-Standard-Icon. Es muss überprüft werden, was in Schritt 13 geändert wurde und warum das Icon nicht mehr funktioniert.
*   **Aktion:**
    1.  Überprüfung der in Schritt 13 vorgenommenen Änderungen
    2.  Korrektur der Icon-Dateien und Verweise in den Android-Ressourcen
    3.  Sicherstellen, dass das Manifest korrekt auf die Icon-Ressourcen verweist
    4.  Verifizierung der adaptiven Icon-Konfiguration
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**

---

**Wichtiger Hinweis für alle weiteren Schritte:**

Bei jedem der oben beschriebenen Korrekturschritte wird wie folgt vorgegangen:

1. **Analysephase:**
   - Aktuellen Code gründlich analysieren
   - Planungs- und Report-Dateien durchlesen, um zu verstehen, was bereits implementiert wurde
   - Potenzielle Problembereiche identifizieren

2. **Planungsphase:**
   - Notwendige Änderungen detailliert dokumentieren
   - Betroffene Codestellen und geplante Modifikationen im Planungsdokument festhalten
   - Sicherstellen, dass alle Aspekte der Anforderung abgedeckt sind

3. **Umsetzungsphase:**
   - Änderungen gemäß Plan implementieren
   - Nach jedem Schritt anhalten für APK-Erstellung und Tests
   - Jeden Schritt im zugehörigen Report-MD-File protokollieren

Die Planung ist darauf ausgerichtet, dass nach jedem Schritt ein Build und Test erfolgt, um Regressionen zu vermeiden und die korrekte Implementierung zu verifizieren.

Jede Änderung muss exakt den genannten Anforderungen entsprechen, ohne Interpretation oder Abweichung.

**Schritt 37: Dokumentation der Implementierung**

*   **Ziel:** Vollständige Dokumentation aller durchgeführten Änderungen und deren Auswirkungen.
*   **Datei:** `docs/implementation_reports/mobile_worktime_screen_redesign_detailed_implemented.md`
*   **Analyse:** Die bisherigen Änderungen müssen systematisch dokumentiert werden, um die Nachvollziehbarkeit zu gewährleisten.
*   **Aktion:**
    1.  Überprüfung aller durchgeführten Schritte
    2.  Dokumentation der Änderungen pro Komponente:
        - TimeTrackerBox
        - TaskList
        - TaskCard
        - SwipeButton
        - Filter-System
        - Modal-System
    3.  Dokumentation der Auswirkungen:
        - UI/UX-Verbesserungen
        - Performance-Optimierungen
        - Wartbarkeitsverbesserungen
    4.  Zusammenfassung der Gesamtimplementierung
*   **STOPP:** 
    1. Prüfen Sie die Änderungen. 
    2. Bauen und testen Sie die App. 
    3. Protokollieren Sie die Ergebnisse im Report-File.
    4. **Warte auf Ihre Freigabe zum Fortfahren.**