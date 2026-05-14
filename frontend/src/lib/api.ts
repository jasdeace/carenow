import { supabase } from './supabase'
import { format } from 'date-fns'

// Helper to strip dosage info (e.g., 500mg, 10정) from drug names for cleaner display
export const cleanDrugName = (name: string): string => {
  if (!name) return '';
  // Remove patterns like 500mg, 10밀리그램, 5정, (500mg), etc.
  let cleaned = name.replace(/\s*\d+\s*(mg|ml|g|mcg|µg|정|밀리그램|밀리리터|캡슐|IU|단위|cc|v|p|s|kg).*$/i, '');
  // Remove content in parentheses if it starts with digits
  cleaned = cleaned.replace(/\(\d+.*?\)/g, '');
  // Remove any trailing dashes or weird characters left behind
  cleaned = cleaned.trim().replace(/[-/_]$/, '').trim();
  return cleaned;
};

export const api = {
  // Medications
  getMedications: async (lovedOneId: string) => {
    const { data, error } = await supabase
      .from('medications')
      .select('*, medication_schedules(*)')
      .eq('loved_one_id', lovedOneId)
      .order('created_at', { ascending: false })
      
    if (error) throw error
    return data
  },

  toggleMedicationActive: async (medId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('medications')
      .update({ is_active: isActive })
      .eq('id', medId)
    if (error) throw error
  },

  getTodayMedications: async (lovedOneId: string) => {
    // For MVP, we simply fetch active medications. 
    // In production, this would join with medication_schedules and medication_logs
    // to determine if they are due today and if they were taken.
    const { data, error } = await supabase
      .from('medications')
      .select('*, medication_schedules(*), medication_logs(*)')
      .eq('loved_one_id', lovedOneId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      
    if (error) throw error
    return data
  },

  addMedication: async (lovedOneId: string, name_ko: string, dosage_amount: string, dosage_unit: string, createdBy: string, scheduleTimes: string[] = ['09:00'], isActive: boolean = true) => {
    console.log('API: addMedication payload:', { lovedOneId, name_ko, dosage_amount, dosage_unit, createdBy, scheduleTimes, isActive });
    
    // 1. Insert Medication
    const { data: medData, error: medError } = await supabase
      .from('medications')
      .insert({
        loved_one_id: lovedOneId,
        name_ko: cleanDrugName(name_ko),
        dosage_amount,
        dosage_unit,
        is_active: isActive,
        created_by: createdBy
      })
      .select()
      .single()

    if (medError) {
      console.error('API: addMedication error:', medError);
      throw medError;
    }

    // 2. Insert Schedules
    if (scheduleTimes && scheduleTimes.length > 0) {
      const scheduleEntries = scheduleTimes.map(time => ({
        medication_id: medData.id,
        time_of_day: time,
        frequency: 'daily'
      }))
      
      const { error: scheduleError } = await supabase
        .from('medication_schedules')
        .insert(scheduleEntries)
        
      if (scheduleError) throw scheduleError
    }

    console.log('API: addMedication SUCCESS');
  },

  updateMedication: async (medId: string, name_ko: string, dosage_amount: string, dosage_unit: string, scheduleTimes: string[]) => {
    console.log('API: updateMedication payload:', { medId, name_ko, dosage_amount, dosage_unit, scheduleTimes });
    
    // 1. Update Medication
    const { error: medError } = await supabase
      .from('medications')
      .update({
        name_ko: cleanDrugName(name_ko),
        dosage_amount,
        dosage_unit,
        updated_at: new Date().toISOString()
      })
      .eq('id', medId)

    if (medError) throw medError

    // 2. Delete existing schedules
    const { error: deleteError } = await supabase
      .from('medication_schedules')
      .delete()
      .eq('medication_id', medId)

    if (deleteError) throw deleteError

    // 3. Insert new schedules
    if (scheduleTimes && scheduleTimes.length > 0) {
      const scheduleEntries = scheduleTimes.map(time => ({
        medication_id: medId,
        time_of_day: time,
        frequency: 'daily'
      }))
      
      const { error: scheduleError } = await supabase
        .from('medication_schedules')
        .insert(scheduleEntries)
        
      if (scheduleError) throw scheduleError
    }
    
    console.log('API: updateMedication SUCCESS');
  },

  acceptMedication: async (medId: string) => {
    const { error } = await supabase
      .from('medications')
      .update({ is_active: true })
      .eq('id', medId)
    if (error) throw error
  },

  deleteMedication: async (medId: string) => {
    // Hard delete: remove the medication from the database entirely
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', medId)
    if (error) throw error
  },

  getPendingMedications: async (lovedOneId: string) => {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('loved_one_id', lovedOneId)
      .eq('is_active', false)
      .eq('is_deleted', false)
    if (error) throw error
    return data
  },

  getWeeklyAdherence: async (lovedOneId: string) => {
    const koDays = ['일', '월', '화', '수', '목', '금', '토']
    
    const formatLabel = (d: Date) => {
      const dayName = koDays[d.getDay()]
      return `${dayName} ${d.getMonth() + 1}.${d.getDate()}`
    }

    // 1. Fetch all active medications
    const { data: meds, error: medsError } = await supabase
      .from('medications')
      .select('id')
      .eq('loved_one_id', lovedOneId)
      .eq('is_active', true)
      .eq('is_deleted', false)
    
    if (medsError) throw medsError
    
    const totalMeds = meds?.length || 0
    if (totalMeds === 0) {
       return Array.from({length: 7}).map((_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          return { day: formatLabel(d), rate: 0 }
       })
    }

    // 2. Fetch logs for the past 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: logs, error: logsError } = await supabase
      .from('medication_logs')
      .select('taken_at, scheduled_at, status')
      .in('medication_id', meds.map(m => m.id))
      // Using an OR condition because some old logs might not have scheduled_at
      .or(`scheduled_at.gte.${sevenDaysAgo.toISOString()},taken_at.gte.${sevenDaysAgo.toISOString()}`)

    if (logsError) throw logsError

    // Group logs by day
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toDateString()
      
      const takenCount = logs?.filter(l => {
        if (l.status !== 'taken') return false;
        const logDate = l.scheduled_at ? new Date(l.scheduled_at).toDateString() : new Date(l.taken_at).toDateString();
        return logDate === dateStr;
      }).length || 0
      
      const rate = Math.min(100, Math.round((takenCount / totalMeds) * 100))
      result.push({ day: formatLabel(d), rate })
    }
    
    return result
  },

  takeMedication: async (medicationId: string, scheduledAt?: string, takenAtOverride?: string) => {
    const { error } = await supabase
      .from('medication_logs')
      .insert({
        medication_id: medicationId,
        status: 'taken',
        scheduled_at: scheduledAt,
        taken_at: takenAtOverride || new Date().toISOString()
      })
    if (error) throw error
  },

  undoMedication: async (logId: string) => {
    const { error } = await supabase
      .from('medication_logs')
      .delete()
      .eq('id', logId)
    if (error) throw error
  },

  // Check-ins
  submitDailyCheckin: async (lovedOneId: string, moodScore: number) => {
    const { error } = await supabase
      .from('daily_checkins')
      .insert({
        loved_one_id: lovedOneId,
        checkin_date: format(new Date(), 'yyyy-MM-dd'),
        checked_in_at: new Date().toISOString(),
        mood_score: moodScore
      })
    if (error) throw error
  },

  getTodayCheckin: async (lovedOneId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('loved_one_id', lovedOneId)
      .eq('checkin_date', today)
      .maybeSingle()
      
    if (error) throw error
    return data
  },

  // Vitals
  getVitalsBP: async (lovedOneId: string) => {
    const { data, error } = await supabase
      .from('vitals_blood_pressure')
      .select('*')
      .eq('loved_one_id', lovedOneId)
      .order('measured_at', { ascending: false })
      .limit(30)
      
    if (error) throw error
    return data
  },

  logVitalBP: async (lovedOneId: string, systolic: number, diastolic: number, pulse?: number) => {
    const { error } = await supabase
      .from('vitals_blood_pressure')
      .insert({
        loved_one_id: lovedOneId,
        systolic,
        diastolic,
        pulse,
        measured_at: new Date().toISOString()
      })
    if (error) throw error
  },

  deleteVitalBP: async (id: string) => {
    const { error } = await supabase
      .from('vitals_blood_pressure')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  getVitalsGlucose: async (lovedOneId: string) => {
    const { data, error } = await supabase
      .from('vitals_glucose')
      .select('*')
      .eq('loved_one_id', lovedOneId)
      .order('measured_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return data
  },

  getVitalsWeight: async (lovedOneId: string) => {
    const { data, error } = await supabase
      .from('vitals_weight')
      .select('*')
      .eq('loved_one_id', lovedOneId)
      .order('measured_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return data
  },

  logVitalGlucose: async (lovedOneId: string, glucoseLevel: number, timingContext: string) => {
    const { error } = await supabase
      .from('vitals_glucose')
      .insert({
        loved_one_id: lovedOneId,
        value_mmol: glucoseLevel,
        measurement_timing: timingContext,
        measured_at: new Date().toISOString()
      })
    if (error) throw error
  },

  deleteVitalGlucose: async (id: string) => {
    const { error } = await supabase
      .from('vitals_glucose')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  logVitalWeight: async (lovedOneId: string, weightKg: number) => {
    const { error } = await supabase
      .from('vitals_weight')
      .insert({
        loved_one_id: lovedOneId,
        weight_kg: weightKg,
        measured_at: new Date().toISOString()
      })
    if (error) throw error
  },

  deleteVitalWeight: async (id: string) => {
    const { error } = await supabase
      .from('vitals_weight')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // Care Circles
  createCareCircleForLovedOne: async (userId: string, userName: string) => {
    // Guard: if a loved_one entry already exists, return it (idempotent)
    const { data: existing } = await supabase
      .from('loved_ones')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (existing) return existing.id

    // 1. Create a Circle
    const { data: circleData, error: circleError } = await supabase
      .from('care_circles')
      .insert({ name: `${userName}'s Circle`, created_by: userId })
      .select('id')
      .single()
    if (circleError) throw circleError

    // 2. Add Loved One record
    const { data: lovedOneData, error: lovedOneError } = await supabase
      .from('loved_ones')
      .insert({ circle_id: circleData.id, user_id: userId, display_name_ko: userName })
      .select('id')
      .single()
    if (lovedOneError) throw lovedOneError

    // 3. Add user to members
    const { error: memberError } = await supabase
      .from('care_circle_members')
      .insert({ circle_id: circleData.id, user_id: userId, role: 'loved_one' })
    if (memberError) throw memberError

    return lovedOneData.id
  },

  getCaregiverLovedOneId: async (caregiverUserId: string) => {
    // Legacy: Returns just the first one. Kept for backward compatibility if needed temporarily.
    const { data: memberData, error: memberError } = await supabase
      .from('care_circle_members')
      .select('circle_id')
      .eq('user_id', caregiverUserId)
      .eq('role', 'caregiver')
      .limit(1)
      .maybeSingle()
      
    if (memberError) throw memberError
    if (!memberData) return null

    const { data: lovedOneData, error: lovedOneError } = await supabase
      .from('loved_ones')
      .select('id')
      .eq('circle_id', memberData.circle_id)
      .limit(1)
      .maybeSingle()

    if (lovedOneError) throw lovedOneError
    return lovedOneData?.id || null
  },

  getGiverTakersList: async (giverUserId: string) => {
    // Find all circles the giver belongs to, including acceptance status
    const { data: memberData, error: memberError } = await supabase
      .from('care_circle_members')
      .select('circle_id, accepted_at')
      .eq('user_id', giverUserId)
      .eq('role', 'caregiver')
      
    if (memberError) throw memberError
    if (!memberData || memberData.length === 0) return []

    const circleAcceptanceMap = new Map(memberData.map(m => [m.circle_id, m.accepted_at]))
    const circleIds = memberData.map(m => m.circle_id)

    // Find all loved ones (Takers) for those circles
    const { data: lovedOnesData, error: lovedOnesError } = await supabase
      .from('loved_ones')
      .select('id, circle_id, user_id, display_name_ko')
      .in('circle_id', circleIds)

    if (lovedOnesError) throw lovedOnesError
    
    // Attach the acceptance status to the taker object
    return (lovedOnesData || []).map(t => ({
      ...t,
      accepted_at: circleAcceptanceMap.get(t.circle_id)
    }))
  },

  getLovedOneCircleId: async (userId: string) => {
    const { data, error } = await supabase
      .from('loved_ones')
      .select('circle_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data?.circle_id || null
  },

  joinCareCircle: async (userId: string, circleId: string) => {
    // Add caregiver to members
    const { error: memberError } = await supabase
      .from('care_circle_members')
      .insert({ circle_id: circleId, user_id: userId, role: 'caregiver' })
    if (memberError) throw memberError
  },

  leaveCareCircle: async (caregiverUserId: string, circleId: string) => {
    // Remove the caregiver's membership from a specific circle
    const { error } = await supabase
      .from('care_circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', caregiverUserId)
      .eq('role', 'caregiver')
    if (error) throw error
  },

  getTakerCircleId: async (lovedOneId: string) => {
    const { data, error } = await supabase
      .from('loved_ones')
      .select('circle_id')
      .eq('id', lovedOneId)
      .maybeSingle()
    if (error) throw error
    return data?.circle_id || null
  },

  joinCareCircleByPhone: async (caregiverUserId: string, phone: string) => {
    // 1. Find user by phone
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('phone_kr', phone)

    if (userError) throw userError
    if (!users || users.length === 0) throw new Error('가입되지 않은 전화번호입니다.')

    // Pick a user (prioritize loved_one if multiple accounts share the same phone)
    let userData = users.find(u => u.role === 'loved_one')
    if (!userData) {
      userData = users.find(u => u.role === 'caregiver') || users[0]
    }

    // 2. Find circle_id from loved_ones
    const { data: lovedOneData, error: lovedOneError } = await supabase
      .from('loved_ones')
      .select('circle_id')
      .eq('user_id', userData.id)
      .limit(1)
      .maybeSingle()

    if (lovedOneError) throw lovedOneError
    if (!lovedOneData) throw new Error('Loved one does not have an active care circle.')

    // 3. Join circle
    return api.joinCareCircle(caregiverUserId, lovedOneData.circle_id)
  },

  getCareCircleViewers: async (circleId: string) => {
    // Get all members in this circle using the explicit user_id foreign key
    const { data, error } = await supabase
      .from('care_circle_members')
      .select(`
        id, 
        user_id, 
        role, 
        accepted_at,
        users:user_id (
          id, 
          name_ko, 
          email, 
          phone_kr
        )
      `)
      .eq('circle_id', circleId)
    if (error) throw error
    return data || []
  },

  acceptCareCircleMember: async (memberId: string) => {
    const { error } = await supabase
      .from('care_circle_members')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', memberId)
    if (error) throw error
  },

  removeCareCircleMember: async (memberId: string) => {
    const { error } = await supabase
      .from('care_circle_members')
      .delete()
      .eq('id', memberId)
    if (error) throw error
  },

  updateUserRole: async (userId: string, role: 'loved_one' | 'caregiver') => {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
    if (error) throw error
  },

  getLabResults: async (lovedOneId: string) => {
    const { data, error } = await supabase
      .from('lab_results')
      .select('*')
      .eq('loved_one_id', lovedOneId)
      .order('recorded_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  saveLabResult: async (lovedOneId: string, recordedAt: string, rawContent: string, parsedData: any) => {
    const { data, error } = await supabase
      .from('lab_results')
      .insert([{
        loved_one_id: lovedOneId,
        recorded_at: recordedAt,
        raw_content: rawContent,
        parsed_data: parsedData
      }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  deleteLabResult: async (id: string) => {
    const { error } = await supabase
      .from('lab_results')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  askAI: async (prompt: string, context: any, history?: any[]) => {
    const { data, error } = await supabase.functions.invoke('ask-ai', {
      body: { prompt, context, history }
    })
    if (error) throw error
    return data.text
  },

  updateLabResultChat: async (id: string, chatHistory: any[]) => {
    const { error } = await supabase
      .from('lab_results')
      .update({ chat_history: chatHistory })
      .eq('id', id)
    if (error) throw error
  },

  searchDrugInfo: async (itemName: string) => {
    const { data, error } = await supabase.functions.invoke('drug-info', {
      body: { itemName }
    })
    if (error) throw error
    return data
  },
}
