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
import { usePrintersDiscovery, type DeviceInfo } from 'react-native-esc-pos-printer'
import { printTestTicket } from '../printing/printReceipt'
import {
  clearPairedPrinter,
  getPairedPrinter,
  setPairedPrinter,
  type PairedPrinter,
} from '../printing/printerStorage'
import { useAuth } from '../auth/AuthContext'
import { hasPermission, PERMISSION_LABELS } from '../auth/permissions'
import {
  DEFAULT_PRIMARY_COLOR,
  useBranding,
  useUpdateBrandColor,
  useUploadLogo,
} from '../hooks/useBranding'
import { useBusinessModules, useUpdateBusinessModules, type BusinessModules } from '../hooks/useBusinessModules'
import { useLabels, useUpdateLabels } from '../hooks/useLabels'
import { usePosLayout, useUpdatePosLayout } from '../hooks/usePosLayout'
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
import { useBrandPalette, type BrandPalette } from '../theme/useBrandPalette'
import { useThemeColors, type ThemeColors } from '../theme/useThemeColors'
import type { Labels } from '../labels/defaultLabels'
import type { PermissionAction, PosLayout, RoleName } from '../types'

const LABEL_FIELDS: { key: keyof Labels; hint: string }[] = [
  { key: 'navDashboard', hint: 'Menú — Dashboard' },
  { key: 'navPos', hint: 'Menú — Punto de venta' },
  { key: 'navCaja', hint: 'Menú — Caja' },
  { key: 'navVentas', hint: 'Menú — Ventas' },
  { key: 'posTitle', hint: 'Título dentro del punto de venta' },
]

const SECTIONS: {
  key:
    | 'marca'
    | 'sucursales'
    | 'equipo'
    | 'etiquetas'
    | 'punto-de-venta'
    | 'modulos'
    | 'impresora'
    | 'auditoria'
  label: string
  permission: PermissionAction | 'admin_only'
}[] = [
  { key: 'marca', label: 'Marca', permission: 'manage_branding' },
  { key: 'sucursales', label: 'Sucursales', permission: 'manage_branches' },
  { key: 'equipo', label: 'Equipo', permission: 'admin_only' },
  { key: 'etiquetas', label: 'Etiquetas', permission: 'manage_branding' },
  { key: 'punto-de-venta', label: 'Punto de venta', permission: 'manage_branding' },
  { key: 'modulos', label: 'Módulos', permission: 'manage_branding' },
  { key: 'impresora', label: 'Impresora', permission: 'manage_branding' },
  { key: 'auditoria', label: 'Auditoría', permission: 'view_audit_log' },
]

type SectionKey = (typeof SECTIONS)[number]['key']

function useVisibleSections() {
  const { membership } = useAuth()
  return SECTIONS.filter((item) =>
    item.permission === 'admin_only'
      ? membership?.role === 'administrador'
      : hasPermission(membership, item.permission),
  )
}

export default function ConfiguracionScreen() {
  const visibleSections = useVisibleSections()
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
  const [section, setSection] = useState<SectionKey | null>(null)
  const activeSection = section && visibleSections.some((s) => s.key === section)
    ? section
    : (visibleSections[0]?.key ?? null)

  if (!activeSection) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>No tienes acceso a ninguna sección de Configuración.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        <FlatList
          horizontal
          data={visibleSections}
          keyExtractor={(s) => s.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setSection(item.key)}
              style={[
                styles.tabChip,
                activeSection === item.key && { backgroundColor: palette.primary, borderColor: palette.primary },
              ]}
            >
              <Text
                style={[styles.tabChipText, activeSection === item.key && styles.tabChipTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {activeSection === 'marca' && <BrandingSection />}
      {activeSection === 'sucursales' && <BranchesSection />}
      {activeSection === 'equipo' && <TeamSection />}
      {activeSection === 'etiquetas' && <LabelsSection />}
      {activeSection === 'punto-de-venta' && <PosLayoutSection />}
      {activeSection === 'modulos' && <ModulesSection />}
      {activeSection === 'impresora' && <PrinterSection />}
      {activeSection === 'auditoria' && <AuditLogSection />}
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
  const colors = useThemeColors()
  const styles = createStyles(colors)
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
        <ActivityIndicator color={color} />
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
        activeOpacity={0.7}
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
              color.toLowerCase() === preset.toLowerCase() && { borderColor: colors.text },
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
        placeholderTextColor={colors.placeholder}
      />

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: color }, updateColor.isPending && styles.disabled]}
        activeOpacity={0.8}
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
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = value === option.value
        return (
          <TouchableOpacity
            key={option.value}
            disabled={disabled}
            activeOpacity={0.75}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              active && { borderColor: palette.primary, backgroundColor: palette.tint },
              disabled && styles.disabled,
            ]}
          >
            <Text style={[styles.chipText, active && { color: palette.dark }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function BranchesSection() {
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
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
          {isLoading && <ActivityIndicator color={palette.primary} style={styles.loading} />}
        </View>
      }
      renderItem={({ item }) => <BranchCard branch={item} palette={palette} />}
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
            placeholderTextColor={colors.placeholder}
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
              { backgroundColor: palette.primary },
              (createBranch.isPending || !newBranch.name.trim()) && styles.disabled,
            ]}
            activeOpacity={0.8}
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

function BranchCard({ branch, palette }: { branch: BranchDetail; palette: BrandPalette }) {
  const colors = useThemeColors()
  const styles = createStyles(colors)
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
        style={[
          styles.saveButton,
          { backgroundColor: palette.primary },
          (!dirty || updateBranch.isPending) && styles.disabled,
        ]}
        activeOpacity={0.8}
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
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
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
          {isLoading && <ActivityIndicator color={palette.primary} style={styles.loading} />}
        </View>
      }
      renderItem={({ item }) => (
        <TeamMemberCard member={item} branches={branches ?? []} palette={palette} />
      )}
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
            placeholderTextColor={colors.placeholder}
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
              { backgroundColor: palette.primary },
              (inviteMember.isPending || !invite.email.trim()) && styles.disabled,
            ]}
            activeOpacity={0.8}
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
  palette,
}: {
  member: TeamMember
  branches: { id: string; name: string }[]
  palette: BrandPalette
}) {
  const colors = useThemeColors()
  const styles = createStyles(colors)
  const updateMember = useUpdateTeamMember()
  const removeMember = useRemoveTeamMember()

  const [form, setForm] = useState<{
    role: RoleName
    branchId: string
    permissionOverrides: Partial<Record<PermissionAction, boolean>>
  }>({
    role: member.role,
    branchId: member.branchId ?? '',
    permissionOverrides: member.permissionOverrides,
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)

  const dirty =
    form.role !== member.role ||
    form.branchId !== (member.branchId ?? '') ||
    JSON.stringify(form.permissionOverrides) !== JSON.stringify(member.permissionOverrides)

  function togglePermission(action: PermissionAction, value: boolean) {
    setForm((p) => ({ ...p, permissionOverrides: { ...p.permissionOverrides, [action]: value } }))
  }

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
        permissionOverrides: form.permissionOverrides,
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
      {form.role !== 'administrador' && (
        <View style={styles.permissionsBlock}>
          <Text style={styles.label}>Permisos adicionales (sobre lo que ya puede su rol)</Text>
          {PERMISSION_LABELS.map((permission) => (
            <View key={permission.value} style={styles.switchRow}>
              <Text style={styles.permissionLabel}>{permission.label}</Text>
              <Switch
                value={hasPermission(
                  { role: form.role, permissionOverrides: form.permissionOverrides },
                  permission.value,
                )}
                onValueChange={(v) => togglePermission(permission.value, v)}
                trackColor={{ true: palette.primary }}
              />
            </View>
          ))}
        </View>
      )}
      <View style={styles.rowButtons}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            styles.rowButtonFlex,
            { backgroundColor: palette.primary },
            (!dirty || updateMember.isPending) && styles.disabled,
          ]}
          activeOpacity={0.8}
          disabled={!dirty || updateMember.isPending}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>
            {updateMember.isPending ? 'Guardando…' : 'Guardar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dangerButton, removeMember.isPending && styles.disabled]}
          activeOpacity={0.7}
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
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
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
        style={[
          styles.saveButton,
          { backgroundColor: palette.primary },
          updateLabels.isPending && styles.disabled,
        ]}
        activeOpacity={0.8}
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

const POS_LAYOUT_OPTIONS: { value: PosLayout; label: string; hint: string }[] = [
  {
    value: 'catalogo',
    label: 'Catálogo',
    hint: 'Tarjetas visuales. Ideal para salones, boutiques y negocios con pocos productos y servicios.',
  },
  {
    value: 'ferreteria',
    label: 'Ferretería',
    hint: 'Lista agrupada por departamento. Ideal para catálogos grandes organizados por categoría.',
  },
  {
    value: 'abarrotes',
    label: 'Abarrotes',
    hint: 'Prioriza escanear o teclear el código de barras, con el total siempre visible en grande.',
  },
]

function PosLayoutSection() {
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
  const { data: posLayout, isLoading } = usePosLayout()
  const updatePosLayout = useUpdatePosLayout()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleSelect(value: PosLayout) {
    if (value === posLayout) return
    setFeedback(null)
    updatePosLayout.mutate(value, {
      onSuccess: () => setFeedback({ type: 'success', text: 'Diseño de venta actualizado' }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo guardar',
        }),
    })
  }

  return (
    <ScrollView style={styles.section} contentContainerStyle={styles.sectionContent}>
      <Text style={styles.cardTitle}>Punto de venta</Text>
      <Text style={styles.cardSubtitle}>
        Elige el diseño de la pantalla de venta según cómo trabaja tu negocio.
      </Text>

      {isLoading && <ActivityIndicator color={palette.primary} style={styles.loading} />}

      {POS_LAYOUT_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          activeOpacity={0.75}
          onPress={() => handleSelect(option.value)}
          disabled={updatePosLayout.isPending}
          style={[
            styles.card,
            posLayout === option.value && {
              borderColor: palette.primary,
              backgroundColor: palette.tint,
            },
          ]}
        >
          <Text style={styles.cardName}>{option.label}</Text>
          <Text style={styles.cardCaption}>{option.hint}</Text>
        </TouchableOpacity>
      ))}

      {feedback && (
        <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>
          {feedback.text}
        </Text>
      )}
    </ScrollView>
  )
}

const MODULE_OPTIONS: { key: keyof BusinessModules; label: string; hint: string }[] = [
  {
    key: 'caja',
    label: 'Caja',
    hint: 'Apertura/cierre de caja y control de efectivo.',
  },
  {
    key: 'inventario',
    label: 'Inventario',
    hint: 'Productos con stock por sucursal.',
  },
  {
    key: 'servicios',
    label: 'Servicios',
    hint: 'Servicios sin stock (ej. cortes, consultas).',
  },
]

function ModulesSection() {
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
  const { data: modules, isLoading } = useBusinessModules()
  const updateModules = useUpdateBusinessModules()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleToggle(key: keyof BusinessModules, value: boolean) {
    if (!modules) return
    setFeedback(null)
    updateModules.mutate(
      { ...modules, [key]: value },
      {
        onSuccess: () => setFeedback({ type: 'success', text: 'Módulos actualizados' }),
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo guardar',
          }),
      },
    )
  }

  if (isLoading || !modules) {
    return (
      <View style={styles.section}>
        <ActivityIndicator color={palette.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.section} contentContainerStyle={styles.sectionContent}>
      <Text style={styles.cardTitle}>Módulos</Text>
      <Text style={styles.cardSubtitle}>
        Prende o apaga secciones enteras según cómo trabaja tu negocio. Se puede reactivar en
        cualquier momento sin perder nada de lo ya capturado.
      </Text>

      {MODULE_OPTIONS.map((option) => (
        <View key={option.key} style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.cardTopInfo}>
              <Text style={styles.cardName}>{option.label}</Text>
              <Text style={styles.cardCaption}>{option.hint}</Text>
            </View>
            <Switch
              value={modules[option.key]}
              onValueChange={(v) => handleToggle(option.key, v)}
              disabled={updateModules.isPending}
              trackColor={{ true: palette.primary }}
            />
          </View>
        </View>
      ))}

      {feedback && (
        <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>
          {feedback.text}
        </Text>
      )}
    </ScrollView>
  )
}

// El emparejamiento se guarda por dispositivo (AsyncStorage, ver
// printerStorage.ts), no por negocio — cada caja/celular con su propia
// impresora térmica. Requiere el dev client de EAS (no funciona en Expo
// Go) porque react-native-esc-pos-printer es un módulo nativo.
function PrinterSection() {
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
  const { start, isDiscovering, printers, printerError } = usePrintersDiscovery()
  const [paired, setPaired] = useState<PairedPrinter | null>(null)
  const [testing, setTesting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  useEffect(() => {
    getPairedPrinter().then(setPaired)
  }, [])

  async function handleSelect(printer: DeviceInfo) {
    const next = { target: printer.target, deviceName: printer.deviceName }
    await setPairedPrinter(next)
    setPaired(next)
    setFeedback(null)
  }

  async function handleForget() {
    await clearPairedPrinter()
    setPaired(null)
  }

  async function handleTestPrint() {
    if (!paired) return
    setTesting(true)
    setFeedback(null)
    try {
      await printTestTicket(paired)
      setFeedback({ type: 'success', text: 'Ticket de prueba enviado' })
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo imprimir',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <ScrollView style={styles.section} contentContainerStyle={styles.sectionContent}>
      <Text style={styles.cardTitle}>Impresora de tickets</Text>
      <Text style={styles.cardSubtitle}>
        Empareja la impresora térmica de esta caja. Solo hace falta una vez por celular/tablet —
        después, cada venta se imprime sola.
      </Text>

      {paired ? (
        <View style={styles.card}>
          <Text style={styles.cardName}>{paired.deviceName || 'Impresora'}</Text>
          <Text style={styles.cardCaption}>{paired.target}</Text>
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                styles.rowButtonFlex,
                { backgroundColor: palette.primary },
                testing && styles.disabled,
              ]}
              activeOpacity={0.8}
              disabled={testing}
              onPress={handleTestPrint}
            >
              <Text style={styles.saveButtonText}>
                {testing ? 'Imprimiendo…' : 'Imprimir prueba'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerButton} activeOpacity={0.7} onPress={handleForget}>
              <Text style={styles.dangerButtonText}>Olvidar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>No hay ninguna impresora configurada en este celular.</Text>
      )}

      {feedback && (
        <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>
          {feedback.text}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: palette.primary },
          isDiscovering && styles.disabled,
        ]}
        activeOpacity={0.8}
        disabled={isDiscovering}
        onPress={() => start()}
      >
        <Text style={styles.saveButtonText}>
          {isDiscovering ? 'Buscando…' : 'Buscar impresoras Bluetooth'}
        </Text>
      </TouchableOpacity>

      {printerError && <Text style={styles.textDanger}>{printerError.message}</Text>}

      {printers.map((printer) => (
        <TouchableOpacity
          key={printer.target}
          style={styles.card}
          activeOpacity={0.75}
          onPress={() => handleSelect(printer)}
        >
          <Text style={styles.cardName}>{printer.deviceName || 'Impresora sin nombre'}</Text>
          <Text style={styles.cardCaption}>{printer.target}</Text>
        </TouchableOpacity>
      ))}
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
  const palette = useBrandPalette()
  const colors = useThemeColors()
  const styles = createStyles(colors)
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
          {isLoading && <ActivityIndicator color={palette.primary} style={styles.loading} />}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    tabBar: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
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
      color: colors.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      marginBottom: 10,
    },
    logoPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    logoPreview: {
      width: 56,
      height: 56,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
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
      color: colors.textMuted,
    },
    logoPickerText: {
      flex: 1,
    },
    logoPickerTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
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
    saveButton: {
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
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    secondaryButtonText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 13,
    },
    disabled: {
      opacity: 0.5,
    },
    textSuccess: {
      color: colors.success,
      fontSize: 13,
      marginTop: 8,
    },
    textDanger: {
      color: colors.danger,
      fontSize: 13,
      marginTop: 8,
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      paddingVertical: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    dashedCard: {
      borderStyle: 'dashed',
    },
    cardTopInfo: {
      flex: 1,
      marginRight: 8,
    },
    cardName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    cardCaption: {
      fontSize: 12,
      color: colors.textMuted,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    permissionsBlock: {
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      marginTop: 4,
      paddingTop: 10,
    },
    permissionLabel: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 8,
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
      borderColor: colors.danger,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    dangerButtonText: {
      color: colors.danger,
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
      color: colors.textMuted,
      marginTop: 4,
    },
  })
}
