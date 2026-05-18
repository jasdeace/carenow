import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { api, cleanDrugName } from '@/lib/api';
import { pickImage } from '@/lib/camera';
import { processImageOCR } from '@/lib/ocr';
import { notificationService } from '@/lib/notifications';

const stripHtml = (s?: string) => (s ? s.replace(/<[^>]+>/g, '').trim() : '');

type FormState = {
  name: string;
  amount: string;
  unit: string;
  times: string[];
};

const EMPTY_FORM: FormState = { name: '', amount: '', unit: 'mg', times: ['09:00'] };

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
        }));
      } else if (result.rawText) {
        setForm((f) => ({ ...f, name: cleanDrugName(result.rawText.split('\n')[0] || '') }));
      }
    } catch (e: any) {
      Alert.alert('인식 실패', e?.message || '다시 시도해주세요');
    } finally {
      setOcrLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
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
    });
    setDrugResults([]);
    setFormOpen(true);
  };

  const onNameChange = (value: string) => {
    setForm((f) => ({ ...f, name: value }));
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
      if (editingId) {
        await api.updateMedication(editingId, form.name, form.amount, form.unit, form.times);
        await notificationService.cancelMedReminders(editingId);
        await notificationService.scheduleMedReminders(editingId, form.name, form.times);
      } else {
        const created: any = await api.addMedication(
          user.id,
          form.name,
          form.amount,
          form.unit,
          user.id,
          form.times,
        );
        const newId = created?.id || created?.[0]?.id;
        if (newId) await notificationService.scheduleMedReminders(newId, form.name, form.times);
      }
      setFormOpen(false);
      await load();
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

  const showDetail = async (name: string) => {
    if (!name) return;
    setDetailLoading(true);
    setDrugDetail({ itemName: name });
    try {
      const res = await api.searchDrugInfo(name);
      setDrugDetail(res.drugs?.[0] || { itemName: name, notFound: true });
    } catch {
      setDrugDetail({ itemName: name, notFound: true });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-secondary">
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <Text className="text-2xl font-bold text-foreground">{t('meds.title')}</Text>
        <Pressable
          onPress={openAdd}
          className="h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg"
        >
          <Ionicons name="add" size={26} color="#ffffff" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#16a34a" className="mt-16" />
      ) : (
        <ScrollView contentContainerClassName="p-4 gap-3">
          {/* Pending meds added by a caregiver */}
          {pending.map((med) => (
            <View
              key={med.id}
              className="flex-row items-center justify-between rounded-2xl border-2 border-yellow-400/40 bg-yellow-50 p-4"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-yellow-400/20">
                  <Ionicons name="medkit" size={20} color="#ca8a04" />
                </View>
                <View>
                  <Text className="text-base font-semibold text-foreground">
                    {med.name_ko || med.name_en}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {med.dosage_amount}
                    {med.dosage_unit}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => accept(med.id)}
                className="h-9 items-center justify-center rounded-lg bg-primary px-4"
              >
                <Text className="font-semibold text-primary-foreground">{t('common.accept')}</Text>
              </Pressable>
            </View>
          ))}

          {meds.length === 0 && pending.length === 0 ? (
            <View className="mt-8 items-center rounded-2xl border border-dashed border-border bg-background py-12">
              <Ionicons name="medkit-outline" size={44} color="#d4d4d8" />
              <Text className="mt-2 text-sm text-muted-foreground">{t('meds.empty')}</Text>
            </View>
          ) : (
            meds.map((med) => (
              <View
                key={med.id}
                className={`rounded-2xl bg-background p-4 shadow-sm ${med.is_active ? '' : 'opacity-60'}`}
              >
                <View className="flex-row items-center justify-between">
                  <Pressable
                    className="flex-1 flex-row items-center gap-3"
                    onPress={() => showDetail(med.name_ko || med.name_en)}
                  >
                    <View
                      className={`h-11 w-11 items-center justify-center rounded-full ${
                        med.is_active ? 'bg-primary/10' : 'bg-secondary'
                      }`}
                    >
                      <Ionicons
                        name="medkit"
                        size={20}
                        color={med.is_active ? '#16a34a' : '#a1a1aa'}
                      />
                    </View>
                    <View>
                      <Text className="text-base font-semibold text-foreground">
                        {med.name_ko || med.name_en}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {med.dosage_amount}
                        {med.dosage_unit}
                      </Text>
                    </View>
                  </Pressable>
                  <View className="flex-row items-center gap-1">
                    <Pressable onPress={() => toggleActive(med)} className="p-1.5">
                      <Ionicons
                        name={med.is_active ? 'toggle' : 'toggle-outline'}
                        size={30}
                        color={med.is_active ? '#16a34a' : '#a1a1aa'}
                      />
                    </Pressable>
                    <Pressable onPress={() => openEdit(med)} className="p-1.5">
                      <Ionicons name="pencil" size={18} color="#16a34a" />
                    </Pressable>
                    <Pressable onPress={() => remove(med)} className="p-1.5">
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
                <View className="mt-3 flex-row flex-wrap gap-2 border-t border-border/60 pt-3">
                  {med.medication_schedules?.map((s: any, i: number) => (
                    <View key={i} className="rounded-md bg-primary/5 px-2 py-1">
                      <Text className="text-xs font-medium text-primary">
                        {s.time_of_day?.substring(0, 5)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add / Edit form */}
      <Modal visible={formOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-lg font-bold text-foreground">
              {editingId ? '약 수정' : t('meds.add_title')}
            </Text>
            <Pressable onPress={() => setFormOpen(false)}>
              <Ionicons name="close" size={26} color="#71717a" />
            </Pressable>
          </View>
          <ScrollView contentContainerClassName="p-4 gap-4" keyboardShouldPersistTaps="handled">
            <Pressable
              onPress={scanPrescription}
              disabled={ocrLoading}
              className="h-20 items-center justify-center gap-1 rounded-2xl border border-primary/40 bg-primary/5"
            >
              {ocrLoading ? (
                <ActivityIndicator color="#16a34a" />
              ) : (
                <>
                  <Ionicons name="camera" size={24} color="#16a34a" />
                  <Text className="text-sm font-medium text-primary">처방전 스캔</Text>
                </>
              )}
            </Pressable>
            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                {t('meds.med_name')}
              </Text>
              <TextInput
                value={form.name}
                onChangeText={onNameChange}
                placeholder="약 이름을 입력하세요"
                placeholderTextColor="#a1a1aa"
                className="h-14 rounded-xl border border-border px-4 text-lg text-foreground"
              />
              {drugSearching && (
                <ActivityIndicator size="small" color="#a1a1aa" className="mt-2" />
              )}
              {drugResults.length > 0 && (
                <View className="mt-1 overflow-hidden rounded-xl border border-border">
                  {drugResults.slice(0, 6).map((drug, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        setForm((f) => ({ ...f, name: cleanDrugName(drug.itemName) }));
                        setDrugResults([]);
                      }}
                      className="border-b border-border/60 bg-background px-3 py-2.5"
                    >
                      <Text className="text-sm font-medium text-foreground">{drug.itemName}</Text>
                      <Text className="text-xs text-muted-foreground">{drug.entpName}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View>
              <Text className="mb-1.5 text-sm font-medium text-foreground">
                {t('meds.dosage_amt')} / {t('meds.dosage_unit')}
              </Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={form.amount}
                  onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                  placeholder="10"
                  placeholderTextColor="#a1a1aa"
                  className="h-12 flex-[2] rounded-xl border border-border px-4 text-lg text-foreground"
                />
                <TextInput
                  value={form.unit}
                  onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))}
                  className="h-12 flex-1 rounded-xl border border-border px-4 text-lg text-foreground"
                />
              </View>
            </View>

            <View>
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-foreground">
                  복용 시간 (하루 {form.times.length}회)
                </Text>
                <Pressable
                  onPress={() => setForm((f) => ({ ...f, times: [...f.times, '09:00'] }))}
                  className="flex-row items-center gap-1"
                >
                  <Ionicons name="add" size={16} color="#16a34a" />
                  <Text className="text-sm font-medium text-primary">추가</Text>
                </Pressable>
              </View>
              <View className="gap-2">
                {form.times.map((time, idx) => (
                  <View key={idx} className="flex-row items-center gap-2">
                    <TextInput
                      value={time}
                      onChangeText={(v) =>
                        setForm((f) => ({
                          ...f,
                          times: f.times.map((tt, i) => (i === idx ? v : tt)),
                        }))
                      }
                      placeholder="09:00"
                      placeholderTextColor="#a1a1aa"
                      className="h-11 flex-1 rounded-xl border border-border px-4 text-base text-foreground"
                    />
                    {form.times.length > 1 && (
                      <Pressable
                        onPress={() =>
                          setForm((f) => ({
                            ...f,
                            times: f.times.filter((_, i) => i !== idx),
                          }))
                        }
                        className="p-2"
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <Pressable
              onPress={save}
              disabled={saving || !form.name.trim() || !form.amount.trim()}
              className={`mt-2 h-14 items-center justify-center rounded-xl bg-primary ${
                saving || !form.name.trim() || !form.amount.trim() ? 'opacity-50' : ''
              }`}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-lg font-semibold text-primary-foreground">
                  {t('common.save')}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Drug detail */}
      <Modal visible={!!drugDetail} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="flex-1 text-lg font-bold text-foreground" numberOfLines={1}>
              {drugDetail?.itemName || '약 정보'}
            </Text>
            <Pressable onPress={() => setDrugDetail(null)}>
              <Ionicons name="close" size={26} color="#71717a" />
            </Pressable>
          </View>
          {detailLoading ? (
            <ActivityIndicator color="#16a34a" className="mt-16" />
          ) : drugDetail?.notFound ? (
            <Text className="mt-12 text-center text-sm text-muted-foreground">
              '{drugDetail.itemName}'에 대한 정보를 찾을 수 없습니다.
            </Text>
          ) : (
            drugDetail && (
              <ScrollView contentContainerClassName="p-4 gap-4">
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
                      <Text className="text-xs font-semibold uppercase text-muted-foreground">
                        {s.label}
                      </Text>
                      <Text className="mt-1 text-sm leading-5 text-foreground">{s.value}</Text>
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
