import { supabase } from './supabase'

export const api = {
  // Medications
  getMedications: async (lovedOneId: string) => {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('loved_one_id', lovedOneId)
      .eq('is_active', true)
      
    if (error) throw error
    return data
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
      
    if (error) throw error
    return data
  },

  logMedicationDose: async (medicationId: string, userId: string, status: 'taken' | 'skipped') => {
    const { error } = await supabase
      .from('medication_logs')
      .insert({
        medication_id: medicationId,
        status: status,
        logged_by: userId,
        taken_at: new Date().toISOString()
      })
    if (error) throw error
  },

  // Check-ins
  submitDailyCheckin: async (lovedOneId: string, moodScore: number) => {
    const { error } = await supabase
      .from('daily_checkins')
      .insert({
        loved_one_id: lovedOneId,
        checkin_date: new Date().toISOString().split('T')[0],
        checked_in_at: new Date().toISOString(),
        mood_score: moodScore
      })
    if (error) throw error
  },

  getTodayCheckin: async (lovedOneId: string) => {
    const today = new Date().toISOString().split('T')[0]
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
      .limit(10)
      
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
        pulse
      })
    if (error) throw error
  },

  logVitalGlucose: async (lovedOneId: string, glucoseLevel: number, timingContext: string) => {
    const { error } = await supabase
      .from('vitals_glucose')
      .insert({
        loved_one_id: lovedOneId,
        glucose_level: glucoseLevel,
        timing_context: timingContext
      })
    if (error) throw error
  },

  logVitalWeight: async (lovedOneId: string, weightKg: number) => {
    const { error } = await supabase
      .from('vitals_weight')
      .insert({
        loved_one_id: lovedOneId,
        weight_kg: weightKg
      })
    if (error) throw error
  },

  // Care Circles
  createCareCircleForLovedOne: async (userId: string, userName: string) => {
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
    // Find the circle the caregiver belongs to
    const { data: memberData, error: memberError } = await supabase
      .from('care_circle_members')
      .select('circle_id')
      .eq('user_id', caregiverUserId)
      .eq('role', 'caregiver')
      .maybeSingle()
      
    if (memberError) throw memberError
    if (!memberData) return null

    // Find the loved one for that circle
    const { data: lovedOneData, error: lovedOneError } = await supabase
      .from('loved_ones')
      .select('id')
      .eq('circle_id', memberData.circle_id)
      .maybeSingle()

    if (lovedOneError) throw lovedOneError
    return lovedOneData?.id || null
  },

  joinCareCircle: async (userId: string, circleId: string) => {
    // Add caregiver to members
    const { error: memberError } = await supabase
      .from('care_circle_members')
      .insert({ circle_id: circleId, user_id: userId, role: 'caregiver' })
    if (memberError) throw memberError
  },
}
