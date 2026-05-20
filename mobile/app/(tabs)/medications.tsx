import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Svg, { Path, Rect } from 'react-native-svg';

import { useAuthStore } from '@/stores/authStore';
import { api, cleanDrugName } from '@/lib/api';
import { pickImage } from '@/lib/camera';
import { processImageOCR } from '@/lib/ocr';
import { notificationService } from '@/lib/notifications';
import { COLORS } from '@/constants/design';

const stripHtml = (s?: string) => (s ? s.replace(/<[^>]+>/g, '').trim() : '');

const timeToDate = (hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  return d;
};
const dateToHHMM = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

type FormState = {
  name: string;
  amount: string;
  unit: string;
  times: string[];
  mfdsItemSeq: string | null;
};

const EMPTY_FORM: FormState = {
  name: '',
  amount: '',
  unit: 'mg',
  times: ['09:00'],
  mfdsItemSeq: null,
};

const TINTS: { bg: string; fg: string }[] = [
  { bg: COLORS.rose[100], fg: '#A24652' },
  { bg: COLORS.coral[100], fg: '#A85A45' },
  { bg: COLORS.teal[100], fg: COLORS.teal[800] },
];

function PillIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={9} width={18} height={8} rx={4} stroke={color} strokeWidth={1.6} />
      <Path d="M12 9v8" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

function FieldLabel({ children, trailing }: { children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}
    >
      <Text style={{ fontSize: 12.5, color: COLORS.ink[500], fontWeight: '600' }}>
        {children}
      </Text>
      {trailing}
    </View>
  );
}

const inputStyle = {
  height: 46,
  paddingHorizontal: 14,
  backgroundColor: COLORS.cream[100],
  borderRadius: 12,
  fontSize: 15,
  color: COLORS.ink[900],
};

export default function Medications() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [meds, setMeds] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [drugSearching, setDrugSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [drugDetail, setDrugDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [pickerIdx, setPickerIdx] = useState<number | null>(null);

  const scanPrescription = async () => {
    const b64 = await pickImage('camera', { quality: 0.85 });
    if (!b64) return;
    setOcrLoading(true);
    try {
      const result = await processImageOCR([b64]);
      const p = result.parsedData;
      if (p) {
        setForm((f) => ({
          ...f,
          name: cleanDrugName(p.medicationName || f.name),
          amount: p.dosageAmount || f.amount,
          unit: p.dosageUnit || f.unit,
          mfdsItemSeq: null,
        }));
      } else if (result.rawText) {
        setForm((f) => ({
          ...f,
          name: cleanDrugName(result.rawText.split('\n')[0] || ''),
          mfdsItemSeq: null,
        }));
      }
    } catch (e: any) {
      Alert.alert('인식 실패', e?.message || '다시 시도해주세요');
    } finally {
      setOcrLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const load = async () => {
    if (!user?.id) return;
    try {
      const [active, pend] = await Promise.all([
        api.getMedications(user.id),
        api.getPendingMedications(user.id),
      ]);
      setMeds(active || []);
      setPending(pend || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDrugResults([]);
    setFormOpen(true);
  };

  const openEdit = (med: any) => {
    setEditingId(med.id);
    setForm({
      name: med.name_ko || med.name_en || '',
      amount: String(med.dosage_amount || ''),
      unit: med.dosage_unit || 'mg',
      times: med.medication_schedules?.map((s: any) => s.time_of_day?.substring(0, 5)) || ['09:00'],
      mfdsItemSeq: med.mfds_item_seq || null,
    });
    setDrugResults([]);
    setFormOpen(true);
  };

  const onNameChange = (value: string) => {
    setForm((f) => ({ ...f, name: value, mfdsItemSeq: null }));
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim().length < 2) {
      setDrugResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setDrugSearching(true);
      try {
        const res = await api.searchDrugInfo(value.trim());
        setDrugResults(res.drugs || []);
      } catch {
        setDrugResults([]);
      } finally {
        setDrugSearching(false);
      }
    }, 400);
  };

  const save = async () => {
    if (!user?.id || !form.name.trim() || !form.amount.trim()) return;
    setSaving(true);
    try {
      type ScheduleResult = Awaited<
        ReturnType<typeof notificationService.scheduleMedReminders>
      >;
      let scheduleResult: ScheduleResult = { status: 'ok' };
      if (editingId) {
        await api.updateMedication(
          editingId,
          form.name,
          form.amount,
          form.unit,
          form.times,
          form.mfdsItemSeq,
        );
        await notificationService.cancelMedReminders(editingId);
        scheduleResult = await notificationService.scheduleMedReminders(
          editingId,
          form.name,
          form.times,
        );
      } else {
        const created: any = await api.addMedication(
          user.id,
          form.name,
          form.amount,
          form.unit,
          user.id,
          form.times,
          true,
          form.mfdsItemSeq,
        );
        const newId = created?.id || created?.[0]?.id;
        if (newId)
          scheduleResult = await notificationService.scheduleMedReminders(
            newId,
            form.name,
            form.times,
          );
      }
      setFormOpen(false);
      await load();

      if (scheduleResult.status === 'denied') {
        Alert.alert(
          '알림 권한 필요',
          '약 복용 알림을 받으려면 설정에서 Bodacare의 알림을 허용해 주세요.',
          [
            { text: '닫기', style: 'cancel' },
            { text: '설정 열기', onPress: () => Linking.openSettings() },
          ],
        );
      } else if (scheduleResult.status === 'error') {
        Alert.alert(
          '알림 등록 실패',
          `약 복용 알림을 등록하지 못했습니다.\n\n${scheduleResult.error || '다시 시도해 주세요.'}`,
        );
      }
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const accept = async (id: string) => {
    try {
      await api.acceptMedication(id);
      load();
    } catch (e: any) {
      Alert.alert('오류', e.message);
    }
  };

  const toggleActive = async (med: any) => {
    try {
      await api.toggleMedicationActive(med.id, !med.is_active);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const remove = (med: any) => {
    Alert.alert('삭제', `${med.name_ko || med.name_en}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteMedication(med.id);
            await notificationService.cancelMedReminders(med.id);
            load();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const showDetail = async (med: any) => {
    const name = med?.name_ko || med?.name_en;
    if (!name) return;
    const itemSeq: string | null = med?.mfds_item_seq || null;
    if (!itemSeq) {
      setDrugDetail({ itemName: name, manual: true });
      return;
    }
    setDetailLoading(true);
    setDrugDetail({ itemName: name });
    try {
      const res = await api.searchDrugInfo(name);
      const match = (res.drugs || []).find((d: any) => d.itemSeq === itemSeq);
      setDrugDetail(match || { itemName: name, notFound: true });
    } catch {
      setDrugDetail({ itemName: name, notFound: true });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.cream[50] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: COLORS.ink[900],
            letterSpacing: -0.6,
          }}
        >
          {t('meds.title')}
        </Text>
        {meds.length > 0 || pending.length > 0 ? (
          <Pressable
            onPress={openAdd}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: COLORS.teal[700],
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.92 : 1,
              shadowColor: '#0F2C2E',
              shadowOpacity: 0.15,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            })}
          >
            <Ionicons name="add" size={22} color="#ffffff" />
          </Pressable>
        ) : (
          <View style={{ width: 40, height: 40 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.teal[700]} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {pending.map((med) => (
            <View
              key={med.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: COLORS.sand[200],
                backgroundColor: COLORS.sand[100],
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: COLORS.paper,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PillIcon color={COLORS.warn[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.ink[900] }}>
                    {med.name_ko || med.name_en}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.ink[500] }}>
                    {med.dosage_amount}
                    {med.dosage_unit}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => accept(med.id)}
                style={{
                  height: 36,
                  paddingHorizontal: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9999,
                  backgroundColor: COLORS.teal[700],
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                  {t('common.accept')}
                </Text>
              </Pressable>
            </View>
          ))}

          {meds.length === 0 && pending.length === 0 ? (
            <Pressable
              onPress={openAdd}
              style={({ pressed }) => ({
                marginTop: 30,
                alignItems: 'center',
                paddingVertical: 48,
                borderRadius: 22,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: COLORS.line,
                backgroundColor: COLORS.paper,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: COLORS.teal[700],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={32} color="#ffffff" />
              </View>
              <Text
                style={{
                  marginTop: 14,
                  fontSize: 15,
                  fontWeight: '600',
                  color: COLORS.ink[700],
                }}
              >
                {t('meds.empty')}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12.5, color: COLORS.ink[400] }}>
                탭해서 첫 약을 추가하세요
              </Text>
            </Pressable>
          ) : (
            meds.map((med, idx) => {
              const tint = TINTS[idx % TINTS.length];
              return (
                <View
                  key={med.id}
                  style={{
                    backgroundColor: COLORS.paper,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: COLORS.lineSoft,
                    padding: 14,
                    marginBottom: 10,
                    opacity: med.is_active ? 1 : 0.6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable
                      onPress={() => showDetail(med)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: tint.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PillIcon color={tint.fg} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{ fontSize: 15.5, fontWeight: '600', color: COLORS.ink[900] }}
                          numberOfLines={1}
                        >
                          {med.name_ko || med.name_en}
                        </Text>
                        <Text style={{ fontSize: 12.5, color: COLORS.ink[500], marginTop: 2 }}>
                          {med.dosage_amount}
                          {med.dosage_unit}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Pressable onPress={() => toggleActive(med)} style={{ padding: 6 }}>
                        <Ionicons
                          name={med.is_active ? 'toggle' : 'toggle-outline'}
                          size={28}
                          color={med.is_active ? COLORS.teal[700] : COLORS.ink[300]}
                        />
                      </Pressable>
                      <Pressable onPress={() => openEdit(med)} style={{ padding: 6 }}>
                        <Ionicons name="pencil" size={16} color={COLORS.teal[700]} />
                      </Pressable>
                      <Pressable onPress={() => remove(med)} style={{ padding: 6 }}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                      </Pressable>
                    </View>
                  </View>
                  {med.medication_schedules?.length > 0 && (
                    <View
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: COLORS.lineSoft,
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 6,
                      }}
                    >
                      {med.medication_schedules.map((s: any, i: number) => (
                        <View
                          key={i}
                          style={{
                            backgroundColor: COLORS.teal[100],
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: 9999,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: COLORS.teal[800],
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {s.time_of_day?.substring(0, 5)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add / Edit form overlay */}
      {formOpen && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 50 }]}>
          <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream[50] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.lineSoft,
                gap: 12,
              }}
            >
              <Pressable onPress={() => setFormOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={COLORS.ink[700]} />
              </Pressable>
              <Text
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 17,
                  fontWeight: '600',
                  color: COLORS.ink[900],
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
              >
                {editingId ? '약 수정' : t('meds.add_title')}
              </Text>
              {(() => {
                const disabled = saving || !form.name.trim() || !form.amount.trim();
                return (
                  <Pressable
                    onPress={save}
                    disabled={disabled}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
                    })}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={COLORS.teal[700]} />
                    ) : (
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: COLORS.teal[700],
                        }}
                      >
                        {t('common.save')}
                      </Text>
                    )}
                  </Pressable>
                );
              })()}
            </View>
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Prescription scan callout */}
              <Pressable
                onPress={scanPrescription}
                disabled={ocrLoading}
                style={{
                  borderRadius: 18,
                  paddingVertical: 20,
                  paddingHorizontal: 20,
                  backgroundColor: COLORS.teal[50],
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: COLORS.teal[300],
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {ocrLoading ? (
                  <ActivityIndicator color={COLORS.teal[700]} />
                ) : (
                  <>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: COLORS.teal[700],
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <Ionicons name="camera" size={22} color="#ffffff" />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.teal[800] }}>
                      처방전 스캔
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.ink[500] }}>
                      AI가 약 정보를 자동으로 채워드려요
                    </Text>
                  </>
                )}
              </Pressable>

              {/* 약 이름 */}
              <View>
                <FieldLabel>{t('meds.med_name')}</FieldLabel>
                <TextInput
                  value={form.name}
                  onChangeText={onNameChange}
                  placeholder="약 이름을 입력하세요"
                  placeholderTextColor={COLORS.ink[300]}
                  style={inputStyle}
                />
                {drugSearching && (
                  <ActivityIndicator size="small" color={COLORS.ink[400]} style={{ marginTop: 8 }} />
                )}
                {drugResults.length > 0 && (
                  <View
                    style={{
                      marginTop: 6,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: COLORS.line,
                      overflow: 'hidden',
                      backgroundColor: COLORS.paper,
                    }}
                  >
                    {drugResults.slice(0, 6).map((drug, i) => (
                      <Pressable
                        key={i}
                        onPress={() => {
                          setForm((f) => ({
                            ...f,
                            name: cleanDrugName(drug.itemName),
                            mfdsItemSeq: drug.itemSeq || null,
                          }));
                          setDrugResults([]);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: i < drugResults.slice(0, 6).length - 1 ? 1 : 0,
                          borderBottomColor: COLORS.lineSoft,
                        }}
                      >
                        <Text
                          style={{ fontSize: 13.5, fontWeight: '500', color: COLORS.ink[900] }}
                        >
                          {drug.itemName}
                        </Text>
                        <Text style={{ fontSize: 11.5, color: COLORS.ink[500], marginTop: 2 }}>
                          {drug.entpName}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* 복용량 / 단위 */}
              <View>
                <FieldLabel>
                  {t('meds.dosage_amt')} / {t('meds.dosage_unit')}
                </FieldLabel>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    value={form.amount}
                    onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                    placeholder="10"
                    placeholderTextColor={COLORS.ink[300]}
                    style={[inputStyle, { flex: 2 }]}
                  />
                  <TextInput
                    value={form.unit}
                    onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))}
                    style={[inputStyle, { flex: 1 }]}
                  />
                </View>
              </View>

              {/* 복용 시간 */}
              <View>
                <FieldLabel
                  trailing={
                    <Pressable
                      onPress={() => setForm((f) => ({ ...f, times: [...f.times, '09:00'] }))}
                      hitSlop={6}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                    >
                      <Ionicons name="add" size={14} color={COLORS.teal[700]} />
                      <Text style={{ fontSize: 12.5, color: COLORS.teal[700], fontWeight: '600' }}>
                        추가
                      </Text>
                    </Pressable>
                  }
                >
                  복용 시간 (하루 {form.times.length}회)
                </FieldLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {form.times.map((time, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => setPickerIdx(idx)}
                      onLongPress={
                        form.times.length > 1
                          ? () =>
                              setForm((f) => ({
                                ...f,
                                times: f.times.filter((_, i) => i !== idx),
                              }))
                          : undefined
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 9999,
                        backgroundColor: COLORS.teal[100],
                      }}
                    >
                      <Ionicons name="time-outline" size={14} color={COLORS.teal[800]} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: COLORS.teal[800],
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {time}
                      </Text>
                      {form.times.length > 1 && (
                        <Text style={{ color: COLORS.teal[800], opacity: 0.55, fontSize: 14 }}>
                          ×
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
                {form.times.length > 1 && (
                  <Text style={{ marginTop: 6, fontSize: 11, color: COLORS.ink[400] }}>
                    길게 눌러 시간을 삭제할 수 있어요
                  </Text>
                )}
              </View>

              <Pressable
                onPress={save}
                disabled={saving || !form.name.trim() || !form.amount.trim()}
                style={({ pressed }) => ({
                  marginTop: 8,
                  height: 54,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  backgroundColor: COLORS.teal[700],
                  opacity: saving || !form.name.trim() || !form.amount.trim() ? 0.5 : pressed ? 0.92 : 1,
                })}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>
                    {t('common.save')}
                  </Text>
                )}
              </Pressable>
            </ScrollView>

            {pickerIdx != null &&
              (Platform.OS === 'ios' ? (
                <Modal transparent animationType="fade" onRequestClose={() => setPickerIdx(null)}>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                    <Pressable
                      onPress={() => setPickerIdx(null)}
                      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,44,46,0.5)' }]}
                    />
                    <View
                      style={{
                        width: '100%',
                        borderRadius: 20,
                        overflow: 'hidden',
                        backgroundColor: COLORS.paper,
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          borderBottomWidth: 1,
                          borderBottomColor: COLORS.lineSoft,
                        }}
                      >
                        <Text
                          style={{
                            textAlign: 'center',
                            fontSize: 15,
                            fontWeight: '600',
                            color: COLORS.ink[900],
                          }}
                        >
                          복용 시간 선택
                        </Text>
                      </View>
                      <DateTimePicker
                        value={timeToDate(form.times[pickerIdx])}
                        mode="time"
                        is24Hour
                        display="spinner"
                        themeVariant="light"
                        style={{ height: 200, alignSelf: 'stretch' }}
                        onChange={(_: DateTimePickerEvent, date?: Date) => {
                          if (date && pickerIdx != null) {
                            const hhmm = dateToHHMM(date);
                            setForm((f) => ({
                              ...f,
                              times: f.times.map((tt, i) => (i === pickerIdx ? hhmm : tt)),
                            }));
                          }
                        }}
                      />
                      <Pressable
                        onPress={() => setPickerIdx(null)}
                        style={{
                          height: 48,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderTopWidth: 1,
                          borderTopColor: COLORS.lineSoft,
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.teal[700] }}>
                          확인
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={timeToDate(form.times[pickerIdx])}
                  mode="time"
                  is24Hour
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    const idx = pickerIdx;
                    setPickerIdx(null);
                    if (event.type === 'set' && date && idx != null) {
                      const hhmm = dateToHHMM(date);
                      setForm((f) => ({
                        ...f,
                        times: f.times.map((tt, i) => (i === idx ? hhmm : tt)),
                      }));
                    }
                  }}
                />
              ))}
          </SafeAreaView>
        </View>
      )}

      {/* Drug detail */}
      <Modal visible={!!drugDetail} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream[50] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.lineSoft,
            }}
          >
            <Text
              style={{ flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.ink[900] }}
              numberOfLines={1}
            >
              {drugDetail?.itemName || '약 정보'}
            </Text>
            <Pressable onPress={() => setDrugDetail(null)} hitSlop={8}>
              <Ionicons name="close" size={24} color={COLORS.ink[700]} />
            </Pressable>
          </View>
          {detailLoading ? (
            <ActivityIndicator color={COLORS.teal[700]} style={{ marginTop: 60 }} />
          ) : drugDetail?.manual ? (
            <View style={{ marginTop: 48, alignItems: 'center', paddingHorizontal: 32 }}>
              <Ionicons name="information-circle-outline" size={40} color={COLORS.ink[300]} />
              <Text
                style={{ marginTop: 12, fontSize: 13, color: COLORS.ink[500], textAlign: 'center' }}
              >
                직접 입력하신 약이라 의약품안전나라 상세정보가 없습니다.
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: COLORS.ink[400],
                  textAlign: 'center',
                }}
              >
                약 정보를 보려면 수정 화면에서 약 이름을 입력하고 검색 결과 중 하나를 선택해 주세요.
              </Text>
            </View>
          ) : drugDetail?.notFound ? (
            <Text
              style={{
                marginTop: 48,
                textAlign: 'center',
                fontSize: 13,
                color: COLORS.ink[500],
              }}
            >
              {drugDetail.itemName}에 대한 정보를 찾을 수 없습니다.
            </Text>
          ) : (
            drugDetail && (
              <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                {[
                  { label: '제조사', value: drugDetail.entpName },
                  { label: '효능', value: stripHtml(drugDetail.efcyQesitm) },
                  { label: '용법·용량', value: stripHtml(drugDetail.useMethodQesitm) },
                  { label: '⚠️ 주의사항', value: stripHtml(drugDetail.atpnQesitm) },
                  { label: '상호작용', value: stripHtml(drugDetail.intrcQesitm) },
                  { label: '부작용', value: stripHtml(drugDetail.seQesitm) },
                  { label: '보관법', value: stripHtml(drugDetail.depositMethodQesitm) },
                ]
                  .filter((s) => s.value)
                  .map((s) => (
                    <View key={s.label}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: COLORS.ink[500],
                          letterSpacing: 0.6,
                        }}
                      >
                        {s.label}
                      </Text>
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 13.5,
                          lineHeight: 20,
                          color: COLORS.ink[900],
                        }}
                      >
                        {s.value}
                      </Text>
                    </View>
                  ))}
              </ScrollView>
            )
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
