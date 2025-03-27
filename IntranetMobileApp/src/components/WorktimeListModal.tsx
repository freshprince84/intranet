/**
 * WorktimeListModal Komponente
 * Zeigt die Zeiteinträge in einem Modal an
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { Modal, Portal, Card, Button, Divider, Chip } from 'react-native-paper';
import { MobileWorkTime } from '../types';
import { formatDateTime, calculateDuration } from '../utils/dateUtils';

interface WorktimeListModalProps {
  visible: boolean;
  onDismiss: () => void;
  workTimes: MobileWorkTime[];
  isRefreshing: boolean;
  onRefresh: () => void;
}

const WorktimeListModal: React.FC<WorktimeListModalProps> = ({
  visible,
  onDismiss,
  workTimes,
  isRefreshing,
  onRefresh
}) => {
  /**
   * Rendert einen Arbeitszeitdatensatz
   */
  const renderWorkTimeItem = ({ item }: { item: MobileWorkTime }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text>{formatDateTime(item.startTime)}</Text>
          {item.offlineId && <Chip icon="cloud-off-outline">Offline</Chip>}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.workTimeDetails}>
          <View>
            <Text>Start</Text>
            <Text>{formatDateTime(item.startTime)}</Text>
          </View>
          
          <View>
            <Text>Ende</Text>
            <Text>{item.endTime ? formatDateTime(item.endTime) : '-'}</Text>
          </View>
          
          <View>
            <Text>Dauer</Text>
            <Text>{calculateDuration(item.startTime, item.endTime || null)}</Text>
          </View>
        </View>
        
        {item.branch && (
          <Text style={styles.branchText}>
            Niederlassung: {item.branch.name}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Zeiteinträge</Text>
            <Button onPress={onDismiss}>Schließen</Button>
          </View>

          <FlatList
            data={workTimes}
            renderItem={renderWorkTimeItem}
            keyExtractor={(item, index) => `worktime-${item.id || index}`}
            contentContainerStyle={styles.listContent}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text>Keine Einträge gefunden</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    height: '80%',
    padding: 0
  },
  modalContent: {
    flex: 1
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  card: {
    marginBottom: 8,
    marginHorizontal: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  divider: {
    marginVertical: 8
  },
  workTimeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  branchText: {
    marginTop: 8,
    color: '#666'
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24
  },
  emptyList: {
    padding: 16,
    alignItems: 'center'
  }
});

export default WorktimeListModal; 