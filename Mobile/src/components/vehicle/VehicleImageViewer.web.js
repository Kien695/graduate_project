import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../utils/theme';

export default function VehicleImageViewer({ images, imageIndex, visible, onRequestClose, onImageIndexChange }) {
  const [current, setCurrent] = useState(imageIndex);
  const [scale, setScale] = useState(1);
  useEffect(() => { setCurrent(imageIndex); setScale(1); }, [imageIndex, visible]);
  const move = (direction) => { const next = (current + direction + images.length) % images.length; setCurrent(next); setScale(1); onImageIndexChange(next); };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}><View style={styles.modal}><View style={styles.header}><TouchableOpacity style={styles.circle} onPress={onRequestClose}><Ionicons name="close" size={28} color={COLORS.white} /></TouchableOpacity><Text style={styles.count}>{current + 1}/{images.length}</Text></View><Pressable style={styles.stage} onPress={() => setScale((value) => value === 1 ? 2 : 1)}><Image source={images[current]} style={[styles.image, { transform: [{ scale }] }]} resizeMode="contain" /></Pressable>{images.length > 1 && <><TouchableOpacity style={[styles.arrow, styles.left]} onPress={() => move(-1)}><Ionicons name="chevron-back" size={30} color={COLORS.white} /></TouchableOpacity><TouchableOpacity style={[styles.arrow, styles.right]} onPress={() => move(1)}><Ionicons name="chevron-forward" size={30} color={COLORS.white} /></TouchableOpacity></>}<View style={styles.zoom}><TouchableOpacity style={styles.zoomButton} onPress={() => setScale((value) => Math.max(1, value - 0.5))}><Text style={styles.zoomText}>−</Text></TouchableOpacity><Text style={styles.zoomValue}>{Math.round(scale * 100)}%</Text><TouchableOpacity style={styles.zoomButton} onPress={() => setScale((value) => Math.min(3, value + 0.5))}><Text style={styles.zoomText}>+</Text></TouchableOpacity></View></View></Modal>;
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#050609' }, header: { position: 'absolute', zIndex: 3, top: 24, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, circle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#171A22DD', alignItems: 'center', justifyContent: 'center' }, count: { color: COLORS.white, backgroundColor: '#171A22DD', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 8, fontWeight: '700' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: '86%', height: '82%' }, arrow: { position: 'absolute', top: '48%', width: 48, height: 48, borderRadius: 24, backgroundColor: '#171A22CC', alignItems: 'center', justifyContent: 'center' }, left: { left: 24 }, right: { right: 24 },
  zoom: { position: 'absolute', bottom: 28, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#171A22DD', borderRadius: 18, padding: 6 }, zoomButton: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center' }, zoomText: { color: COLORS.white, fontSize: 24 }, zoomValue: { color: COLORS.white, width: 58, textAlign: 'center', fontSize: 12, fontWeight: '700' },
});
