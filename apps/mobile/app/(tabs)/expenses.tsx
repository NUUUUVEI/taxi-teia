import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform, Image, Linking,
} from 'react-native'
import {
  format, startOfYear, endOfYear, startOfMonth, endOfMonth,
  getYear, addMonths, subMonths, addYears, subYears, isSameMonth,
} from 'date-fns'
import * as ImagePicker from 'expo-image-picker'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { supabase, SUPABASE_URL } from '../../src/lib/supabase'
import { colors } from '../../src/lib/theme'
import { Ionicons } from '@expo/vector-icons'

type ExpenseCategory =
  | 'fuel' | 'mechanics' | 'insurance'
  | 'gestoria' | 'tolls' | 'amortization' | 'other'

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
  fuel:         { label: 'Gasolina',    icon: 'flame-outline',                color: '#F59E0B' },
  mechanics:    { label: 'Mecànica',    icon: 'construct-outline',            color: '#EF4444' },
  insurance:    { label: 'Assegurança', icon: 'shield-checkmark-outline',     color: '#3B82F6' },
  gestoria:     { label: 'Gestoria',    icon: 'briefcase-outline',            color: '#8B5CF6' },
  tolls:        { label: 'Peatges',     icon: 'car-outline',                  color: '#06B6D4' },
  amortization: { label: 'Amortitz.',   icon: 'trending-down-outline',        color: '#10B981' },
  other:        { label: 'Altres',      icon: 'ellipsis-horizontal-outline',  color: '#6B7280' },
}

interface Expense {
  id: string
  created_at: string
  date: string
  category: ExpenseCategory
  amount: number
  description: string | null
  invoice_photo_url: string | null
}

type Period = 'month' | 'year'

export default function ExpensesScreen() {
  const [period, setPeriod] = useState<Period>('month')
  /** Any month/year can be browsed, not just the current one. */
  const [anchor, setAnchor] = useState(new Date())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState<Expense | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Add / edit expense form. `editingId` null means we're adding a new one.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('fuel')
  const [newAmount, setNewAmount] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newPhoto, setNewPhoto] = useState<string | null>(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const from = period === 'month' ? startOfMonth(anchor) : startOfYear(anchor)
    const to   = period === 'month' ? endOfMonth(anchor)   : endOfYear(anchor)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('fare')
      .eq('status', 'completed')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())

    setIncome((bookings ?? []).reduce((s, b) => s + (Number(b.fare) || 0), 0))

    const { data: exp } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', format(from, 'yyyy-MM-dd'))
      .lte('date', format(to, 'yyyy-MM-dd'))
      .order('date', { ascending: false })

    setExpenses((exp ?? []) as Expense[])
    setLoading(false)
  }, [period, anchor])

  useEffect(() => { fetchData() }, [fetchData])

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netBenefit = income - totalExpenses

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {})

  // ── Photo picker ────────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    })
    if (!result.canceled && result.assets[0]) {
      setNewPhoto(result.assets[0].uri)
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permís necessari', 'Necessitem accés a la càmera per fer fotos de factures.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      setNewPhoto(result.assets[0].uri)
    }
  }

  const uploadPhoto = async (uri: string, expenseId: string): Promise<string | null> => {
    try {
      const rawExt = (uri.split('.').pop() ?? 'jpg').toLowerCase()
      const ext = rawExt === 'jpeg' ? 'jpg' : rawExt
      const path = `invoices/${expenseId}.${ext}`
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg'

      const formData = new FormData()
      formData.append('file', { uri, name: `invoice.${ext}`, type: mime } as any)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/expense-invoices/${path}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            'x-upsert': 'true',
          },
          body: formData,
        }
      )

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        Alert.alert(
          'Factura no desada',
          `La despesa s'ha guardat, però la foto no s'ha pogut pujar.\n\n${detail.slice(0, 160)}`
        )
        return null
      }

      const { data: urlData } = supabase.storage.from('expense-invoices').getPublicUrl(path)
      return urlData.publicUrl
    } catch {
      return null
    }
  }

  // ── Add / edit expense ──────────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null)
    setNewCategory('fuel')
    setNewAmount('')
    setNewDesc('')
    setNewDate(format(new Date(), 'yyyy-MM-dd'))
    setNewPhoto(null)
    setExistingPhotoUrl(null)
  }

  const openAdd = () => {
    resetForm()
    setModalVisible(true)
  }

  const openEdit = (e: Expense) => {
    setEditingId(e.id)
    setNewCategory(e.category)
    setNewAmount(String(e.amount))
    setNewDesc(e.description ?? '')
    setNewDate(e.date)
    setNewPhoto(null)
    setExistingPhotoUrl(e.invoice_photo_url)
    setModalVisible(true)
  }

  const handleSave = async () => {
    const amount = parseFloat(newAmount.replace(',', '.'))
    if (!newAmount || isNaN(amount)) {
      Alert.alert('Error', 'Introdueix un import vàlid')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      Alert.alert('Data no vàlida', 'Fes servir el format aaaa-mm-dd.')
      return
    }

    setSaving(true)

    const fields = {
      date: newDate,
      category: newCategory,
      amount,
      description: newDesc || null,
    }

    let expenseId = editingId

    if (editingId) {
      const { error } = await supabase.from('expenses').update(fields).eq('id', editingId)
      if (error) {
        Alert.alert('Error', error.message)
        setSaving(false)
        return
      }
    } else {
      // Insert first so the photo can be stored under the new row's id.
      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert(fields)
        .select()
        .single()

      if (error || !inserted) {
        Alert.alert('Error', error?.message ?? 'Error guardant')
        setSaving(false)
        return
      }
      expenseId = inserted.id
    }

    if (newPhoto && expenseId) {
      const photoUrl = await uploadPhoto(newPhoto, expenseId)
      if (photoUrl) {
        await supabase
          .from('expenses')
          .update({ invoice_photo_url: photoUrl })
          .eq('id', expenseId)
      }
    }

    setSaving(false)
    setModalVisible(false)
    resetForm()
    fetchData()
  }

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar', 'Eliminar aquesta despesa?', [
      { text: 'Cancel·lar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('expenses').delete().eq('id', id)
          fetchData()
        },
      },
    ])
  }

  // ── Year-end PDF ─────────────────────────────────────────────────────────────
  const generatePdf = async () => {
    setGeneratingPdf(true)
    const year = getYear(anchor)

    // Get full year data
    const { data: yearExp } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: true })

    const { data: yearBookings } = await supabase
      .from('bookings')
      .select('fare, start_time')
      .eq('status', 'completed')
      .gte('start_time', `${year}-01-01T00:00:00`)
      .lte('start_time', `${year}-12-31T23:59:59`)

    const allExp = (yearExp ?? []) as Expense[]
    const totalInc = (yearBookings ?? []).reduce((s, b) => s + (Number(b.fare) || 0), 0)
    const totalExp = allExp.reduce((s, e) => s + e.amount, 0)
    const net = totalInc - totalExp

    const catTotals = allExp.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})

    const catRows = (Object.entries(catTotals) as [ExpenseCategory, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => `
        <tr>
          <td>${CATEGORY_META[cat]?.label ?? cat}</td>
          <td style="text-align:right">€${amount.toFixed(2)}</td>
        </tr>`)
      .join('')

    const expRows = allExp.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${CATEGORY_META[e.category as ExpenseCategory]?.label ?? e.category}</td>
        <td>${e.description ?? ''}</td>
        <td style="text-align:right">€${e.amount.toFixed(2)}</td>
        <td style="text-align:center">${e.invoice_photo_url ? '✓' : ''}</td>
      </tr>`).join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #111; font-size: 12px; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h2 { font-size: 14px; margin-top: 28px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { text-align: left; background: #f5f5f5; padding: 6px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; }
          .kpi { display: flex; gap: 24px; margin: 20px 0; }
          .kpi-box { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px 20px; min-width: 140px; }
          .kpi-value { font-size: 20px; font-weight: 700; }
          .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; margin-top: 2px; }
          .net-positive { color: #16a34a; }
          .net-negative { color: #dc2626; }
          .footer { margin-top: 48px; font-size: 10px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Resum fiscal ${year}</h1>
        <p style="color:#666">Taxi Teià · Generat el ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>

        <div class="kpi">
          <div class="kpi-box">
            <div class="kpi-value">€${totalInc.toFixed(2)}</div>
            <div class="kpi-label">Ingressos totals</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-value" style="color:#dc2626">€${totalExp.toFixed(2)}</div>
            <div class="kpi-label">Despeses totals</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-value ${net >= 0 ? 'net-positive' : 'net-negative'}">€${net.toFixed(2)}</div>
            <div class="kpi-label">Benefici net</div>
          </div>
        </div>

        <h2>Despeses per categoria</h2>
        <table>
          <thead><tr><th>Categoria</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${catRows}</tbody>
        </table>

        <h2>Registre complet de despeses</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Categoria</th><th>Descripció</th>
              <th style="text-align:right">Import</th><th style="text-align:center">Factura</th>
            </tr>
          </thead>
          <tbody>${expRows}</tbody>
        </table>

        <div class="footer">
          Document generat automàticament per l'app Taxi Teià. Conserva tots els justificants originals.
        </div>
      </body>
      </html>`

    const { uri } = await Print.printToFileAsync({ html, base64: false })

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Resum fiscal ${year}`,
      })
    } else {
      Alert.alert('PDF generat', `Arxiu desat a: ${uri}`)
    }
    setGeneratingPdf(false)
  }

  const periodLabel = period === 'month'
    ? format(anchor, 'MMMM yyyy')
    : `Any ${getYear(anchor)}`

  const step = (direction: -1 | 1) => {
    setAnchor(a =>
      period === 'month'
        ? (direction === 1 ? addMonths(a, 1) : subMonths(a, 1))
        : (direction === 1 ? addYears(a, 1) : subYears(a, 1))
    )
  }

  const isCurrentPeriod = period === 'month'
    ? isSameMonth(anchor, new Date())
    : getYear(anchor) === getYear(new Date())

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>BENEFICIS</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.pdfBtn}
              onPress={generatePdf}
              disabled={generatingPdf}
            >
              <Ionicons name="document-text-outline" size={14} color={colors.gold} />
              <Text style={styles.pdfBtnText}>{generatingPdf ? '...' : 'PDF'}</Text>
            </TouchableOpacity>
            <View style={styles.periodTabs}>
              {(['month', 'year'] as Period[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.tab, period === p && styles.tabActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                    {p === 'month' ? 'MES' : 'ANY'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Period navigation — browse any month or year */}
        <View style={styles.periodNav}>
          <TouchableOpacity onPress={() => step(-1)} style={styles.periodNavBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.gold} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.periodLabelWrap}
            onPress={() => setAnchor(new Date())}
            disabled={isCurrentPeriod}
          >
            <Text style={styles.periodLabel}>{periodLabel}</Text>
            {!isCurrentPeriod && (
              <Text style={styles.periodToday}>Tornar a l&apos;actual</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => step(1)} style={styles.periodNavBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.gold} />
          </TouchableOpacity>
        </View>

        {/* KPI cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>€{income.toFixed(2)}</Text>
            <Text style={styles.kpiLabel}>Ingressos</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: colors.error }]}>€{totalExpenses.toFixed(2)}</Text>
            <Text style={styles.kpiLabel}>Despeses</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: netBenefit >= 0 ? colors.success : colors.error }]}>
            <Text style={[styles.kpiValue, { color: netBenefit >= 0 ? colors.success : colors.error }]}>
              €{netBenefit.toFixed(2)}
            </Text>
            <Text style={styles.kpiLabel}>Benefici net</Text>
          </View>
        </View>

        {/* Category breakdown */}
        {Object.keys(byCategory).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Per categoria</Text>
            {(Object.entries(byCategory) as [ExpenseCategory, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amount]) => {
                const meta = CATEGORY_META[cat]
                const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                return (
                  <View key={cat} style={styles.catRow}>
                    <View style={styles.catLeft}>
                      <View style={[styles.catDot, { backgroundColor: meta.color }]} />
                      <Text style={styles.catLabel}>{meta.label}</Text>
                    </View>
                    <View style={styles.catRight}>
                      <View style={styles.catBarBg}>
                        <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                      </View>
                      <Text style={styles.catAmount}>€{amount.toFixed(2)}</Text>
                    </View>
                  </View>
                )
              })}
          </View>
        )}

        {/* Tax reminder */}
        <View style={styles.taxBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.gold} />
          <Text style={styles.taxText}>
            Recorda guardar tots els justificants per a la declaració de la renda. Prem PDF per generar el resum anual per a la gestoria.
          </Text>
        </View>

        {/* Expense list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registre de despeses</Text>
          {expenses.length === 0 ? (
            <Text style={styles.empty}>Cap despesa registrada</Text>
          ) : (
            expenses.map(e => {
              const meta = CATEGORY_META[e.category as ExpenseCategory] ?? CATEGORY_META.other
              return (
                <TouchableOpacity
                  key={e.id}
                  style={styles.expRow}
                  onPress={() => openEdit(e)}
                  onLongPress={() => handleDelete(e.id)}
                >
                  <View style={[styles.expIcon, { backgroundColor: meta.color + '20' }]}>
                    <Ionicons name={meta.icon as any} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expCategory}>{meta.label}</Text>
                    {e.description && (
                      <Text style={styles.expDesc} numberOfLines={1}>{e.description}</Text>
                    )}
                    <Text style={styles.expDate}>{format(new Date(e.date), 'dd/MM/yyyy')}</Text>
                  </View>
                  {e.invoice_photo_url && (
                    <TouchableOpacity
                      onPress={() => setViewingInvoice(e)}
                      hitSlop={10}
                      style={{ marginRight: 8 }}
                    >
                      <Ionicons name="document-attach" size={18} color={colors.gold} />
                    </TouchableOpacity>
                  )}
                  <Text style={styles.expAmount}>€{e.amount.toFixed(2)}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.textMuted}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color={colors.black} />
      </TouchableOpacity>

      {/* Add / edit expense modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Corregir despesa' : 'Nova despesa'}
                </Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); resetForm() }}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Category */}
              <Text style={styles.fieldLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(Object.entries(CATEGORY_META) as [ExpenseCategory, typeof CATEGORY_META[ExpenseCategory]][]).map(([cat, meta]) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, newCategory === cat && { borderColor: meta.color, backgroundColor: meta.color + '20' }]}
                      onPress={() => setNewCategory(cat)}
                    >
                      <Ionicons name={meta.icon as any} size={14} color={newCategory === cat ? meta.color : colors.textMuted} />
                      <Text style={[styles.catChipText, newCategory === cat && { color: meta.color }]}>{meta.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Import (€)</Text>
              <TextInput
                style={styles.input}
                value={newAmount}
                onChangeText={setNewAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Data</Text>
              <TextInput
                style={styles.input}
                value={newDate}
                onChangeText={setNewDate}
                placeholder="yyyy-mm-dd"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Descripció (opcional)</Text>
              <TextInput
                style={styles.input}
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="p. ex. Repsol Teià, canvi d'oli..."
                placeholderTextColor={colors.textMuted}
              />

              {/* Photo invoice */}
              <Text style={styles.fieldLabel}>Foto de factura (opcional)</Text>
              {newPhoto ? (
                <View style={{ marginBottom: 16 }}>
                  <Image source={{ uri: newPhoto }} style={styles.photoPreview} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setNewPhoto(null)} style={styles.removePhotoBtn}>
                    <Ionicons name="trash-outline" size={14} color={colors.error} />
                    <Text style={styles.removePhotoText}>Descartar aquesta foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {existingPhotoUrl && (
                    <View style={{ marginBottom: 12 }}>
                      <Image
                        source={{ uri: existingPhotoUrl }}
                        style={styles.photoPreview}
                        resizeMode="cover"
                      />
                      <Text style={styles.photoHint}>
                        Factura ja adjuntada. Fes una foto nova per substituir-la.
                      </Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                      <Ionicons name="camera-outline" size={18} color={colors.gold} />
                      <Text style={styles.photoBtnText}>Fer foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                      <Ionicons name="image-outline" size={18} color={colors.gold} />
                      <Text style={styles.photoBtnText}>Galeria</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? 'Guardant...' : editingId ? 'Guardar canvis' : 'Guardar despesa'}
                </Text>
              </TouchableOpacity>

              {editingId && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    setModalVisible(false)
                    handleDelete(editingId)
                    resetForm()
                  }}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.error} />
                  <Text style={styles.deleteBtnText}>Eliminar despesa</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invoice viewer */}
      <Modal visible={!!viewingInvoice} animationType="fade" transparent>
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.viewerTitle}>
                {viewingInvoice
                  ? (CATEGORY_META[viewingInvoice.category as ExpenseCategory] ?? CATEGORY_META.other).label
                  : ''}
              </Text>
              {viewingInvoice && (
                <Text style={styles.viewerMeta}>
                  {format(new Date(viewingInvoice.date), 'dd/MM/yyyy')} · €
                  {viewingInvoice.amount.toFixed(2)}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setViewingInvoice(null)} hitSlop={12}>
              <Ionicons name="close" size={26} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.viewerBody}
            maximumZoomScale={4}
            minimumZoomScale={1}
          >
            {viewingInvoice?.invoice_photo_url && (
              <Image
                source={{ uri: viewingInvoice.invoice_photo_url }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.viewerOpenBtn}
            onPress={() => {
              if (viewingInvoice?.invoice_photo_url) {
                Linking.openURL(viewingInvoice.invoice_photo_url)
              }
            }}
          >
            <Ionicons name="open-outline" size={16} color={colors.gold} />
            <Text style={styles.viewerOpenText}>Obrir en mida completa</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  periodNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, marginTop: 12,
  },
  periodNavBtn: { padding: 10 },
  periodLabelWrap: { flex: 1, alignItems: 'center' },
  periodToday: { color: colors.gold, fontSize: 10, marginTop: 2 },
  photoHint: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  deleteBtnText: { color: colors.error, fontSize: 13 },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', paddingTop: 48 },
  viewerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  viewerTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  viewerMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  viewerBody: { flexGrow: 1, justifyContent: 'center', padding: 12 },
  viewerImage: { width: '100%', aspectRatio: 0.7, borderRadius: 4 },
  viewerOpenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 20,
  },
  viewerOpenText: { color: colors.gold, fontSize: 13 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLabel: { color: colors.gold, fontSize: 11, letterSpacing: 3 },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.gold + '50', borderRadius: 2,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  pdfBtnText: { color: colors.gold, fontSize: 11, fontWeight: '600' },
  periodTabs: { flexDirection: 'row', gap: 4 },
  tab: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 2 },
  tabActive: { borderColor: colors.gold, backgroundColor: colors.gold + '15' },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  tabTextActive: { color: colors.gold },
  periodLabel: { color: colors.textSecondary, fontSize: 12, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' },
  kpiRow: { flexDirection: 'row', padding: 16, gap: 8 },
  kpiCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 2, padding: 12, alignItems: 'center' },
  kpiValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  kpiLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 110 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { color: colors.textSecondary, fontSize: 12 },
  catRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBarBg: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: 6, borderRadius: 3 },
  catAmount: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', width: 64, textAlign: 'right' },
  taxBox: {
    flexDirection: 'row', gap: 10, margin: 16,
    backgroundColor: colors.gold + '10', borderWidth: 1, borderColor: colors.gold + '30',
    borderRadius: 4, padding: 12,
  },
  taxText: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, flex: 1 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 24, fontSize: 13 },
  expRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  expIcon: { width: 38, height: 38, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  expCategory: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  expDesc: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  expDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  expAmount: { color: colors.error, fontSize: 14, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.gold, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  fieldLabel: { color: colors.textSecondary, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 14, marginBottom: 16,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
    borderColor: colors.border, borderRadius: 20,
  },
  catChipText: { color: colors.textMuted, fontSize: 12 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderWidth: 1, borderColor: colors.gold + '50',
    borderRadius: 2, borderStyle: 'dashed',
  },
  photoBtnText: { color: colors.gold, fontSize: 12 },
  photoPreview: {
    width: '100%', height: 160, borderRadius: 4,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  removePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
  },
  removePhotoText: { color: colors.error, fontSize: 12 },
  saveBtn: {
    backgroundColor: colors.gold, paddingVertical: 16,
    borderRadius: 2, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: colors.black, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
})
