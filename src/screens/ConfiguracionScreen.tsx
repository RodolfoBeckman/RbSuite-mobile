import { useEffect, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  DEFAULT_PRIMARY_COLOR,
  useBranding,
  useUpdateBrandColor,
  useUploadLogo,
} from '../hooks/useBranding'
import { useLabels, useUpdateLabels } from '../hooks/useLabels'
import {
  useBranches,
  useCreateBranch,
  useManageBranches,
  useUpdateBranch,
  type BranchDetail,
} from '../hooks/useBranches'
import {
  useInviteTeamMember,
  useRemoveTeamMember,
  useTeamMembers,
  useUpdateTeamMember,
  type TeamMember,
} from '../hooks/useTeam'
import { useAuditLogs } from '../hooks/useAuditLogs'
import type { Labels } from '../labels/defaultLabels'
import type { RoleName } from '../types'

const LABEL_FIELDS: { key: keyof Labels; hint: string }[] = [
  { key: 'navDashboard', hint: 'Menú — Dashboard' },
  { key: 'navPos', hint: 'Menú — Punto de venta' },
  { key: 'navCaja', hint: 'Menú — Caja' },
  { key: 'navVentas', hint: 'Menú — Ventas' },
  { key: 'posTitle', hint: 'Título dentro del punto de venta' },
]

const SECTIONS = [
  { key: 'marca', label: 'Marca' },
  { key: 'sucursales', label: 'Sucursales' },
  { key: 'equipo', label: 'Equipo' },
  { key: 'etiquetas', label: 'Etiquetas' },
  { key: 'auditoria', label: 'Auditoría' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

export default function ConfiguracionScreen() {
  const [section, setSection] = useState<SectionKey>('marca')

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        <FlatList
          horizontal
          data={SECTIONS}
          keyExtractor={(s) => s.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSection(item.key)}
              style={[styles.tabChip, section === item.key && styles.tabChipActive]}
            >
              <Text
                style={[styles.tabChipText, section === item.key && styles.tabChipTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {section === 'marca' && <BrandingSection />}
      {section === 'sucursales' && <BranchesSection />}
      {section === 'equipo' && <TeamSection />}
      {section === 'etiquetas' && <LabelsSection />}
      {section === 'auditoria' && <AuditLogSection />}
    </SafeAreaView>
  )
}

const PRESET_COLORS = [
  '#2F6FA8',
  '#2563eb',
  '#7B3F56',
  '#B58A2A',
  '#2F7D57',
  '#B5495B',
  '#0f172a',
  '#0891b2',
  '#c2410c',
]

function BrandingSection() {
  const { data: branding, isLoading } = useBranding()
  const updateColor = useUpdateBrandColor()
  const uploadLogo = useUploadLogo()

  const [color, setColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  useEffect(() => {
    if (branding?.primaryColor) setColor(branding.primaryColor)
  }, [branding?.primaryColor])

  function handleSaveColor() {
    setFeedback(null)
    updateColor.mutate(color, {
      onSuccess: () => setFeedback({ type: 'success', text: 'Color de marca actualizado' }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo guardar el color',
        }),
    })
  }

  async function handlePickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setFeedback({ type: 'error', text: 'Necesitamos permiso para acceder a tus fotos' })
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return

    setFeedback(null)
    uploadLogo.mutate(
      { uri: result.assets[0].uri, fileName: result.assets[0].fileName },
      {
        onSuccess: () => setFeedback({ type: 'success', text: 'Logo actualizado' }),
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo subir el logo',
          }),
      },
    )
  }

  if (isLoading) {
    return (
      <View style={styles.section}>
        <ActivityIndicator color="#2563eb" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.section} contentContainerStyle={styles.sectionContent}>
      <Text style={styles.cardTitle}>Marca de tu negocio</Text>
      <Text style={styles.cardSubtitle}>
        El logo y el color se usan en el encabezado y los acentos de toda la app.
      </Text>

      <Text style={styles.label}>Logo</Text>
      <TouchableOpacity
        style={styles.logoPicker}
        onPress={handlePickLogo}
        disabled={uploadLogo.isPending}
      >
        <View style={styles.logoPreview}>
          {branding?.logoUrl ? (
            <Image source={{ uri: branding.logoUrl }} style={styles.logoImage} />
          ) : (
            <Text style={styles.logoPlaceholder}>Sin logo</Text>
          )}
        </View>
        <View style={styles.logoPickerText}>
          <Text style={styles.logoPickerTitle}>
            {uploadLogo.isPending ? 'Subiendo…' : 'Elegir foto de la galería'}
          </Text>
          <Text style={styles.cardCaption}>PNG, JPG o WEBP</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>Color de marca</Text>
      <View style={styles.colorGrid}>
        {PRESET_COLORS.map((preset) => (
          <TouchableOpacity
            key={preset}
            onPress={() => setColor(preset)}
            style={[
              styles.colorSwatch,
              { backgroundColor: preset },
              color.toLowerCase() === preset.toLowerCase() && styles.colorSwatchActive,
            ]}
          />
        ))}
      </View>
      <TextInput
        style={styles.input}
        value={color}
        onChangeText={setColor}
        autoCapitalize="none"
        placeholder="#2563eb"
        placeholderTextColor="#94a3b8"
      />

      <TouchableOpacity
        style={[styles.saveButton, updateColor.isPending && styles.disabled]}
        disabled={updateColor.isPending}
        onPress={handleSaveColor}
      >
        <Text style={styles.saveButtonText}>
          {updateColor.isPending ? 'Guardando…' : 'Guardar color'}
        </Text>
      </TouchableOpacity>

      {feedback && (
        <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>
          {feedback.text}
        </Text>
      )}
    </ScrollView>
  )
}

const TIMEZONE_OPTIONS = [
  'America/Mexico_City',
  'America/Tijuana',
  'America/Cancun',
  'America/Hermosillo',
]

function ChipRow<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          style={[
            styles.chip,
            value === option.value && styles.chipActive,
            disabled && styles.disabled,
          ]}
        >
          <Text style={[styles.chipText, value === option.value && styles.chipTextActive]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function BranchesSection() {
  const { data: branches, isLoading } = useManageBranches()
  const createBranch = useCreateBranch()

  const [newBranch, setNewBranch] = useState({
    name: '',
    address: '',
    timezone: TIMEZONE_OPTIONS[0],
  })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleCreate() {
    if (!newBranch.name.trim()) return
    setFeedback(null)
    createBranch.mutate(newBranch, {
      onSuccess: () => {
        setFeedback({ type: 'success', text: 'Sucursal creada' })
        setNewBranch({ name: '', address: '', timezone: TIMEZONE_OPTIONS[0] })
      },
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo crear la sucursal',
        }),
    })
  }

  return (
    <FlatList
      style={styles.section}
      contentContainerStyle={styles.sectionContent}
      data={branches ?? []}
      keyExtractor={(b) => b.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.cardTitle}>Sucursales</Text>
          <Text style={styles.cardSubtitle}>
            Da de alta y edita las sucursales de tu negocio. Desactivar una sucursal la oculta
            del punto de venta sin borrar su historial.
          </Text>
          {isLoading && <ActivityIndicator color="#2563eb" style={styles.loading} />}
        </View>
      }
      renderItem={({ item }) => <BranchCard branch={item} />}
      ListEmptyComponent={
        !isLoading ? (
          <Text style={styles.emptyText}>Aún no tienes sucursales registradas.</Text>
        ) : null
      }
      ListFooterComponent={
        <View style={[styles.card, styles.dashedCard]}>
          <Text style={styles.cardName}>Nueva sucursal</Text>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Norte"
            placeholderTextColor="#94a3b8"
            value={newBranch.name}
            onChangeText={(v) => setNewBranch((p) => ({ ...p, name: v }))}
          />
          <Text style={styles.label}>Dirección (opcional)</Text>
          <TextInput
            style={styles.input}
            value={newBranch.address}
            onChangeText={(v) => setNewBranch((p) => ({ ...p, address: v }))}
          />
          <Text style={styles.label}>Zona horaria</Text>
          <ChipRow
            options={TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz.split('/')[1] }))}
            value={newBranch.timezone}
            onChange={(tz) => setNewBranch((p) => ({ ...p, timezone: tz }))}
          />
          <TouchableOpacity
            style={[
              styles.saveButton,
              (createBranch.isPending || !newBranch.name.trim()) && styles.disabled,
            ]}
            disabled={createBranch.isPending || !newBranch.name.trim()}
            onPress={handleCreate}
          >
            <Text style={styles.saveButtonText}>
              {createBranch.isPending ? 'Creando…' : 'Agregar sucursal'}
            </Text>
          </TouchableOpacity>
          {feedback && (
            <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>
              {feedback.text}
            </Text>
          )}
        </View>
      }
    />
  )
}

function BranchCard({ branch }: { branch: BranchDetail }) {
  const updateBranch = useUpdateBranch()
  const [form, setForm] = useState({
    name: branch.name,
    address: branch.address ?? '',
    timezone: branch.timezone,
    active: branch.active,
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)

  const dirty =
    form.name !== branch.name ||
    form.address !== (branch.address ?? '') ||
    form.timezone !== branch.timezone ||
    form.active !== branch.active

  function handleSave() {
    setFeedback(null)
    updateBranch.mutate(
      { id: branch.id, ...form },
      { onSuccess: () => setFeedback('success'), onError: () => setFeedback('error') },
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
      />
      <Text style={styles.label}>Dirección</Text>
      <TextInput
        style={styles.input}
        value={form.address}
        onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
      />
      <Text style={styles.label}>Zona horaria</Text>
      <ChipRow
        options={TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz.split('/')[1] }))}
        value={form.timezone}
        onChange={(tz) => setForm((p) => ({ ...p, timezone: tz }))}
      />
      <View style={styles.switchRow}>
        <Text style={styles.label}>Activa</Text>
        <Switch value={form.active} onValueChange={(v) => setForm((p) => ({ ...p, active: v }))} />
      </View>
      <TouchableOpacity
        style={[styles.saveButton, (!dirty || updateBranch.isPending) && styles.disabled]}
        disabled={!dirty || updateBranch.isPending}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>
          {updateBranch.isPending ? 'Guardando…' : 'Guardar'}
        </Text>
      </TouchableOpacity>
      {feedback === 'success' && <Text style={styles.textSuccess}>Guardado</Text>}
      {feedback === 'error' && <Text style={styles.textDanger}>Error al guardar</Text>}
    </View>
  )
}

const ROLE_OPTIONS: { value: RoleName; label: string }[] = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'vendedor', label: 'Vendedor' },
]

function TeamSection() {
  const { data: members, isLoading } = useTeamMembers()
  const { data: branches } = useBranches()
  const inviteMember = useInviteTeamMember()

  const [invite, setInvite] = useState<{ email: string; role: RoleName; branchId: string }>({
    email: '',
    role: 'vendedor',
    branchId: '',
  })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleInvite() {
    if (!invite.email.trim()) return
    if (invite.role === 'vendedor' && !invite.branchId) {
      setFeedback({ type: 'error', text: 'Elige la sucursal del vendedor' })
      return
    }
    setFeedback(null)
    inviteMember.mutate(
      {
        email: invite.email.trim(),
        role: invite.role,
        branchId: invite.role === 'vendedor' ? invite.branchId : null,
      },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', text: 'Invitación enviada' })
          setInvite({ email: '', role: 'vendedor', branchId: '' })
        },
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo enviar la invitación',
          }),
      },
    )
  }

  return (
    <FlatList
      style={styles.section}
      contentContainerStyle={styles.sectionContent}
      data={members ?? []}
      keyExtractor={(m) => m.userId}
      ListHeaderComponent={
        <View>
          <Text style={styles.cardTitle}>Equipo</Text>
          <Text style={styles.cardSubtitle}>
            Invita a tu equipo y asigna su rol y sucursal. Administrador y Gerente ven todas las
            sucursales; un Vendedor queda restringido a la suya.
          </Text>
          {isLoading && <ActivityIndicator color="#2563eb" style={styles.loading} />}
        </View>
      }
      renderItem={({ item }) => <TeamMemberCard member={item} branches={branches ?? []} />}
      ListEmptyComponent={
        !isLoading ? (
          <Text style={styles.emptyText}>Aún no tienes compañeros invitados.</Text>
        ) : null
      }
      ListFooterComponent={
        <View style={[styles.card, styles.dashedCard]}>
          <Text style={styles.cardName}>Invitar a alguien</Text>
          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#94a3b8"
            value={invite.email}
            onChangeText={(v) => setInvite((p) => ({ ...p, email: v }))}
          />
          <Text style={styles.label}>Rol</Text>
          <ChipRow
            options={ROLE_OPTIONS}
            value={invite.role}
            onChange={(role) => setInvite((p) => ({ ...p, role }))}
          />
          {invite.role === 'vendedor' && (
            <>
              <Text style={styles.label}>Sucursal</Text>
              <ChipRow
                options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
                value={invite.branchId}
                onChange={(id) => setInvite((p) => ({ ...p, branchId: id }))}
              />
            </>
          )}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (inviteMember.isPending || !invite.email.trim()) && styles.disabled,
            ]}
            disabled={inviteMember.isPending || !invite.email.trim()}
            onPress={handleInvite}
          >
            <Text style={styles.saveButtonText}>
              {inviteMember.isPending ? 'Enviando…' : 'Enviar invitación'}
            </Text>
          </TouchableOpacity>
          {feedback && (
            <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>
              {feedback.text}
            </Text>
          )}
        </View>
      }
    />
  )
}

function TeamMemberCard({
  member,
  branches,
}: {
  member: TeamMember
  branches: { id: string; name: string }[]
}) {
  const updateMember = useUpdateTeamMember()
  const removeMember = useRemoveTeamMember()

  const [form, setForm] = useState<{ role: RoleName; branchId: string }>({
    role: member.role,
    branchId: member.branchId ?? '',
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)

  const dirty = form.role !== member.role || form.branchId !== (member.branchId ?? '')

  function handleSave() {
    if (form.role === 'vendedor' && !form.branchId) {
      setFeedback('error')
      return
    }
    setFeedback(null)
    updateMember.mutate(
      {
        userId: member.userId,
        role: form.role,
        branchId: form.role === 'vendedor' ? form.branchId : null,
      },
      { onSuccess: () => setFeedback('success'), onError: () => setFeedback('error') },
    )
  }

  function handleRemove() {
    Alert.alert(`¿Quitar acceso a ${member.email}?`, undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => removeMember.mutate(member.userId) },
    ])
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardName} numberOfLines={1}>
        {member.email}
      </Text>
      <Text style={styles.label}>Rol</Text>
      <ChipRow
        options={ROLE_OPTIONS}
        value={form.role}
        onChange={(role) => setForm((p) => ({ ...p, role }))}
      />
      {form.role === 'vendedor' && (
        <>
          <Text style={styles.label}>Sucursal</Text>
          <ChipRow
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            value={form.branchId}
            onChange={(id) => setForm((p) => ({ ...p, branchId: id }))}
          />
        </>
      )}
      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            styles.rowButtonFlex,
            (!dirty || updateMember.isPending) && styles.disabled,
          ]}
          disabled={!dirty || updateMember.isPending}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>
            {updateMember.isPending ? 'Guardando…' : 'Guardar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dangerButton, removeMember.isPending && styles.disabled]}
          disabled={removeMember.isPending}
          onPress={handleRemove}
        >
          <Text style={styles.dangerButtonText}>Quitar</Text>
        </TouchableOpacity>
      </View>
      {feedback === 'success' && <Text style={styles.textSuccess}>Guardado</Text>}
      {feedback === 'error' && <Text style={styles.textDanger}>Error al guardar</Text>}
    </View>
  )
}

function LabelsSection() {
  const labels = useLabels()
  const updateLabels = useUpdateLabels()

  const [form, setForm] = useState<Labels>(labels)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  useEffect(() => {
    setForm(labels)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(labels)])

  function handleSave() {
    setFeedback(null)
    updateLabels.mutate(form, {
      onSuccess: () => setFeedback({ type: 'success', text: 'Textos actualizados' }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo guardar',
        }),
    })
  }

  return (
    <ScrollView style={styles.section} contentContainerStyle={styles.sectionContent}>
      <Text style={styles.cardTitle}>Textos de la interfaz</Text>
      <Text style={styles.cardSubtitle}>
        Personaliza los nombres que ve tu equipo — por ejemplo, si no manejas servicios, puedes
        quitar esa palabra del menú de ventas.
      </Text>

      {LABEL_FIELDS.map(({ key, hint }) => (
        <View key={key}>
          <Text style={styles.label}>{hint}</Text>
          <TextInput
            style={styles.input}
            value={form[key]}
            onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
          />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveButton, updateLabels.isPending && styles.disabled]}
        disabled={updateLabels.isPending}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>
          {updateLabels.isPending ? 'Guardando…' : 'Guardar textos'}
        </Text>
      </TouchableOpacity>

      {feedback && (
        <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>
          {feedback.text}
        </Text>
      )}
    </ScrollView>
  )
}

const ACTION_LABEL: Record<string, string> = {
  cancel_sale: 'Canceló una venta',
  create_business_product: 'Agregó un producto',
  update_business_product: 'Editó un producto',
  adjust_stock: 'Ajustó inventario',
  cash_withdrawal: 'Retiro de caja',
  invite_team_member: 'Invitó a un miembro del equipo',
  update_team_member: 'Cambió rol/sucursal de un miembro',
  remove_team_member: 'Quitó acceso a un miembro',
}

function formatAuditDetails(details: Record<string, unknown>): string {
  return Object.entries(details ?? {})
    .map(([key, value]) => {
      if (
        value &&
        typeof value === 'object' &&
        'before' in (value as object) &&
        'after' in (value as object)
      ) {
        const { before, after } = value as { before: unknown; after: unknown }
        return `${key}: ${before ?? '—'} → ${after ?? '—'}`
      }
      return `${key}: ${value ?? '—'}`
    })
    .join(' · ')
}

const auditDateFormat = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' })

const DATE_PRESETS: { value: string; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'last7', label: 'Últimos 7 días' },
  { value: 'all', label: 'Todo' },
]

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function presetRange(preset: string): { from?: Date; to?: Date } {
  const today = startOfDay(new Date())
  if (preset === 'today') return { from: today }
  if (preset === 'yesterday') {
    const from = new Date(today)
    from.setDate(from.getDate() - 1)
    return { from, to: today }
  }
  if (preset === 'last7') {
    const from = new Date(today)
    from.setDate(from.getDate() - 6)
    return { from }
  }
  return {}
}

function AuditLogSection() {
  const [preset, setPreset] = useState('today')
  const [actionFilter, setActionFilter] = useState<string>('')
  const range = presetRange(preset)
  const { data, isLoading, loadMore } = useAuditLogs({
    from: range.from,
    to: range.to,
    action: actionFilter || null,
  })

  return (
    <FlatList
      style={styles.section}
      contentContainerStyle={styles.sectionContent}
      data={data?.items ?? []}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.cardTitle}>Auditoría</Text>
          <Text style={styles.cardSubtitle}>
            Quién hizo qué en acciones sensibles: cancelar ventas, cambiar precios, ajustar
            inventario, retiros de caja, y cambios al equipo.
          </Text>
          <ChipRow
            options={DATE_PRESETS}
            value={preset}
            onChange={setPreset}
          />
          <ChipRow
            options={[
              { value: '', label: 'Todas las acciones' },
              ...Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label })),
            ]}
            value={actionFilter}
            onChange={setActionFilter}
          />
          {isLoading && <ActivityIndicator color="#2563eb" style={styles.loading} />}
        </View>
      }
      renderItem={({ item: entry }) => {
        const details = formatAuditDetails(entry.details)
        return (
          <View style={styles.card}>
            <View style={styles.auditTopRow}>
              <Text style={styles.cardName}>{ACTION_LABEL[entry.action] ?? entry.action}</Text>
              <Text style={styles.cardCaption}>
                {auditDateFormat.format(new Date(entry.createdAt))}
              </Text>
            </View>
            <Text style={styles.cardCaption}>{entry.actorEmail ?? 'Sistema'}</Text>
            {details && <Text style={styles.auditDetails}>{details}</Text>}
          </View>
        )
      }}
      ListEmptyComponent={
        !isLoading ? <Text style={styles.emptyText}>Sin actividad registrada todavía.</Text> : null
      }
      ListFooterComponent={
        data?.hasMore ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={loadMore}>
            <Text style={styles.secondaryButtonText}>Cargar más</Text>
          </TouchableOpacity>
        ) : null
      }
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10,
  },
  tabBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabChipTextActive: {
    color: '#fff',
  },
  section: {
    flex: 1,
  },
  sectionContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loading: {
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  logoPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  logoPreview: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    fontSize: 10,
    color: '#94a3b8',
  },
  logoPickerText: {
    flex: 1,
  },
  logoPickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: '#0f172a',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  disabled: {
    opacity: 0.5,
  },
  textSuccess: {
    color: '#16a34a',
    fontSize: 13,
    marginTop: 8,
  },
  textDanger: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  dashedCard: {
    borderStyle: 'dashed',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardCaption: {
    fontSize: 12,
    color: '#94a3b8',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#1d4ed8',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rowButtonFlex: {
    flex: 1,
    marginTop: 0,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 13,
  },
  auditTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  auditDetails: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
})
