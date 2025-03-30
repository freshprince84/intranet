# Implementierungsplan: Neugestaltung WorktimeScreen (Mobile App)

**Ziel:** Modernisierung des Designs des `WorktimeScreen` in der `IntranetMobileApp` gemäss den Vorgaben aus `docs/implementation_plans/modern_design.md`, `docs/core/DESIGN_STANDARDS.md` und zusätzlichen Benutzerwünschen, unter strikter Einhaltung der Projektregeln (`immer.mdc`, `mdfiles.mdc`).

**Vorgehen:** Schrittweise Implementierung mit Build & Test nach jedem abgeschlossenen Schritt.

**Dateien:**
*   **Plan:** `docs/implementation_plans/mobile_worktime_screen_redesign_detailed.md` (Diese Datei)
*   **Report:** `docs/implementation_reports/mobile_worktime_screen_redesign_detailed_implemented.md` (Wird während der Umsetzung gefüllt)

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
*   **STOPP:** Baue die App für Android (`npm run android` oder via Android Studio) und iOS (`npm run ios` oder via Xcode). Stelle sicher, dass die App ohne Fehler startet, auch wenn noch keine sichtbaren Änderungen vorhanden sind. **Warte auf Freigabe.**

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
*   **STOPP:** Baue die App. Es ist noch keine Funktion implementiert, aber der Build sollte ohne Fehler durchlaufen und die neue Datei erkennen. **Warte auf Freigabe.**

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
*   **STOPP:** Baue die App. Du solltest nun den Platzhalter-Slider anstelle der alten Buttons sehen. Die Funktionalität ist noch nicht gegeben. **Warte auf Freigabe.**

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
*   **STOPP:** Baue die App. Der Slider sollte jetzt funktionieren (zieh- und rückfederbar). Die `onConfirm`-Logik (Start/Stop) wird ausgelöst, wenn weit genug gezogen wird. Teste dies (z.B. mit `console.log` im Handler in `WorktimeScreen.tsx`). **Warte auf Freigabe.**

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
*   **STOPP:** Baue die App. Teste, ob das Ziehen des Sliders nun korrekt die Zeiterfassung startet bzw. stoppt. Überprüfe die UI-Updates (Timer-Anzeige etc.) und mögliche Ladezustände/Fehlermeldungen. **Warte auf Freigabe.**

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
*   **STOPP:** Baue die App. Überprüfe, ob der Icon-Button korrekt angezeigt wird und das Klicken darauf die Arbeitszeitliste öffnet. **Warte auf Freigabe.**

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
*   **STOPP:** Baue die App. Überprüfe, ob die Icon-Buttons in der Taskliste korrekt angezeigt werden und das Klicken darauf die entsprechenden Modals (Filter, Neues Task Detail) öffnet. **Warte auf Freigabe.**

---

**Schritt 8: TaskList Item Styling (Card Struktur)**

*   **Ziel:** Jeden Task in der Liste mit einer `react-native-paper` Card umschliessen.
*   **Datei:** `IntranetMobileApp/src/components/TaskList.tsx` (oder wo immer das Rendering eines einzelnen Tasks stattfindet, z.B. in einer `.map`-Funktion in `WorktimeScreen.tsx`).
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
*   **STOPP:** Baue die App. Die Taskliste sollte nun aus einzelnen Cards bestehen. Überprüfe das grundlegende Layout und die Klickbarkeit (falls implementiert). **Warte auf Freigabe.**

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
*   **STOPP:** Baue die App. Überprüfe, ob der Status jedes Tasks nun als Chip mit passendem Icon/Farbe angezeigt wird. **Warte auf Freigabe.**

---

**Schritt 10: TaskList Item Styling (Typografie & Layout)**

*   **Ziel:** Finale Anpassung von Schriftarten, Grössen, Farben und Abständen innerhalb der Task-Cards.
*   **Datei:** Wo das einzelne Task-Item gerendert wird.
*   **Analyse:** Überprüfe alle `Text`-Komponenten und `View`-Container innerhalb der `Card.Content`.
*   **Aktion:** Passe die `style`-Props aller Elemente an die Vorgaben aus `DESIGN_STANDARDS.md` an (Schriftgrössen `sm`, `base`, `lg`; Schriftstärken `normal`, `medium`, `semibold`; Farben `Primärtext`, `Sekundärtext`; Abstände `margin`, `padding`).
*   **STOPP:** Baue die App. Überprüfe das finale Aussehen der Task-Items auf Lesbarkeit, Konsistenz und Einhaltung der Design-Vorgaben. **Warte auf Freigabe.**

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
*   **STOPP:** Baue die App. Öffne nacheinander die verschiedenen Modals (Zeiteinträge, Task Filter, Task Detail) und prüfe auf ein konsistentes, modernes Erscheinungsbild. **Warte auf Freigabe.**

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
*   **STOPP:** Baue die App. Überprüfe das Gesamtlayout, den Hintergrund und die Abstände des `WorktimeScreen`. Stelle sicher, dass Inhalte nicht von Notch oder Home Indicator verdeckt werden. **Warte auf Freigabe.**

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
*   **STOPP:** **NACHDEM** du die Icon-Dateien manuell ersetzt hast: Baue die App für Android und iOS komplett neu (ggf. Build-Cache löschen). Überprüfe auf dem Homescreen des Geräts/Emulators, ob das neue App-Icon korrekt angezeigt wird. **Warte auf Freigabe für den Abschluss.**

--- 