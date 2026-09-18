import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import BranchPicker from '../components/BranchPicker'
import ComboCreateSelect from '../components/ComboCreateSelect'
import FormModal from '../components/FormModal'
import { useActiveBranch } from '../hooks/useActiveBranch'
import { useBusinessModules } from '../hooks/useBusinessModules'
import {
  useAdjustStock,
  useBrands,
  useBusinessProducts,
  useCategories,
  useCreateBrand,
  useCreateCategory,
  useCreateProduct,
  useCreateProductFamily,
  useCreateService,
  useCreateUnit,
  useProductFamilies,
  useSearchCatalogProducts,
  useServicesAdmin,
  useUnits,
  useUpdateProduct,
  useUpdateService,
  type BusinessProduct,
  type CatalogProductMatch,
  type ServiceItem,
} from '../hooks/useInventory'

const PAGE_SIZES = [10, 25, 50]

export default function InventoryScreen() {
  const activeBranchId = useActiveBranch()
  const { data: modules } = useBusinessModules()
  const [tab, setTab] = useState<'productos' | 'servicios'>('productos')

  useEffect(() => {
    if (modules?.servicios === false) setTab('productos')
  }, [modules?.servicios])

  if (!activeBranchId) {
    return (
      <SafeAreaView style={styles.container}>
        <BranchPicker title="Elige la sucursal para ver su inventario" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {modules?.servicios !== false && (
        <View style={styles.tabRow}>
          <TabButton active={tab === 'productos'} onPress={() => setTab('productos')} label="Productos" />
          <TabButton active={tab === 'servicios'} onPress={() => setTab('servicios')} label="Servicios" />
        </View>
      )}
      {tab === 'productos' ? (
        <ProductsSection branchId={activeBranchId} />
      ) : (
        <ServicesSection />
      )}
    </SafeAreaView>
  )
}

function TabButton({
  active,
  onPress,
  label,
}: {
  active: boolean
  onPress: () => void
  label: string
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function ProductsSection({ branchId }: { branchId: string }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useBusinessProducts(branchId, { page, pageSize, search })
  const products = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Productos</Text>
        <Text style={styles.sectionSubtitle}>
          El precio es el mismo en todas las sucursales; el stock es el de la sucursal activa.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, styles.searchInput]}
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Buscar por nombre o código de barras…"
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Text style={styles.addButtonText}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator style={styles.loading} color="#2563eb" />}

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.emptyText}>No hay productos que coincidan.</Text> : null
        }
        renderItem={({ item }) => <ProductCard product={item} branchId={branchId} />}
        ListFooterComponent={
          <View style={styles.paginationBlock}>
            <View style={styles.pageSizeRow}>
              {PAGE_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  onPress={() => {
                    setPageSize(size)
                    setPage(1)
                  }}
                  style={[styles.pageSizeChip, pageSize === size && styles.pageSizeChipActive]}
                >
                  <Text
                    style={[
                      styles.pageSizeChipText,
                      pageSize === size && styles.pageSizeChipTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.totalText}>{total} en total</Text>
            </View>
            <View style={styles.pagerRow}>
              <TouchableOpacity
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={[styles.pagerButton, page <= 1 && styles.disabled]}
              >
                <Text style={styles.pagerButtonText}>Anterior</Text>
              </TouchableOpacity>
              <Text style={styles.pagerLabel}>
                Página {page} de {totalPages}
              </Text>
              <TouchableOpacity
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={[styles.pagerButton, page >= totalPages && styles.disabled]}
              >
                <Text style={styles.pagerButtonText}>Siguiente</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {showModal && <ProductFormModal branchId={branchId} onClose={() => setShowModal(false)} />}
    </View>
  )
}

function ProductCard({ product, branchId }: { product: BusinessProduct; branchId: string }) {
  const updateProduct = useUpdateProduct()
  const { data: categories } = useCategories()
  const createCategory = useCreateCategory()

  const [form, setForm] = useState({
    categoryId: product.categoryId,
    salePrice: String(product.salePrice),
    purchasePrice: product.purchasePrice != null ? String(product.purchasePrice) : '',
    minimumStock: String(product.minimumStock),
    active: product.active,
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)
  const [showAdjust, setShowAdjust] = useState(false)

  const dirty =
    form.categoryId !== product.categoryId ||
    form.salePrice !== String(product.salePrice) ||
    form.purchasePrice !== (product.purchasePrice != null ? String(product.purchasePrice) : '') ||
    form.minimumStock !== String(product.minimumStock) ||
    form.active !== product.active

  const lowStock = product.stock <= product.minimumStock

  function handleSave() {
    setFeedback(null)
    updateProduct.mutate(
      {
        id: product.id,
        categoryId: form.categoryId,
        salePrice: Number(form.salePrice) || 0,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        minimumStock: Number(form.minimumStock) || 0,
        active: form.active,
      },
      { onSuccess: () => setFeedback('success'), onError: () => setFeedback('error') },
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTopInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {product.name}
          </Text>
          {product.familyName && (
            <Text style={styles.cardCaption}>Familia: {product.familyName}</Text>
          )}
          <Text style={styles.cardCaption}>{product.brandName ?? 'Sin marca'}</Text>
        </View>
        <Switch value={form.active} onValueChange={(v) => setForm((p) => ({ ...p, active: v }))} />
      </View>

      <ComboCreateSelect
        label="Categoría"
        items={categories ?? []}
        value={form.categoryId}
        onChange={(id) => setForm((p) => ({ ...p, categoryId: id }))}
        onCreate={(name) => createCategory.mutateAsync(name)}
        placeholder="Sin categoría"
      />

      <View style={styles.row2}>
        <View style={styles.rowField}>
          <Text style={styles.label}>Precio venta</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={form.salePrice}
            onChangeText={(v) => setForm((p) => ({ ...p, salePrice: v }))}
          />
        </View>
        <View style={styles.rowField}>
          <Text style={styles.label}>Precio compra</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={form.purchasePrice}
            onChangeText={(v) => setForm((p) => ({ ...p, purchasePrice: v }))}
          />
        </View>
      </View>

      <View style={styles.rowField}>
        <Text style={styles.label}>Stock mínimo</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={form.minimumStock}
          onChangeText={(v) => setForm((p) => ({ ...p, minimumStock: v }))}
        />
      </View>

      <View style={styles.stockRow}>
        <Text style={[styles.stockText, lowStock && styles.textDanger]}>
          Stock: {product.stock} {product.unitName}
        </Text>
        <TouchableOpacity onPress={() => setShowAdjust(true)}>
          <Text style={styles.adjustLink}>Ajustar</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, (!dirty || updateProduct.isPending) && styles.disabled]}
        disabled={!dirty || updateProduct.isPending}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>
          {updateProduct.isPending ? 'Guardando…' : 'Guardar'}
        </Text>
      </TouchableOpacity>
      {feedback === 'success' && <Text style={styles.textSuccess}>Guardado</Text>}
      {feedback === 'error' && <Text style={styles.textDanger}>Error al guardar</Text>}

      {showAdjust && (
        <AdjustStockModal product={product} branchId={branchId} onClose={() => setShowAdjust(false)} />
      )}
    </View>
  )
}

function AdjustStockModal({
  product,
  branchId,
  onClose,
}: {
  product: BusinessProduct
  branchId: string
  onClose: () => void
}) {
  const adjustStock = useAdjustStock()
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleSubmit() {
    const value = Number(quantity)
    if (!value) return
    setFeedback(null)
    adjustStock.mutate(
      { businessProductId: product.id, branchId, quantity: value, reason: reason.trim() },
      {
        onSuccess: () => onClose(),
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo registrar',
          }),
      },
    )
  }

  return (
    <FormModal
      title={`Ajustar stock — ${product.name}`}
      onClose={onClose}
      isDirty={quantity.trim() !== '' || reason.trim() !== ''}
    >
      <Text style={styles.subtitleText}>
        Stock actual: {product.stock} {product.unitName}
      </Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="Cantidad (positivo entra, negativo sale)"
        placeholderTextColor="#94a3b8"
        value={quantity}
        onChangeText={setQuantity}
      />
      <TextInput
        style={styles.input}
        placeholder="Motivo (ej. compra, merma, conteo)"
        placeholderTextColor="#94a3b8"
        value={reason}
        onChangeText={setReason}
      />
      {feedback && (
        <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>
          {feedback.text}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.saveButton, (adjustStock.isPending || !quantity) && styles.disabled]}
        disabled={adjustStock.isPending || !quantity}
        onPress={handleSubmit}
      >
        <Text style={styles.saveButtonText}>
          {adjustStock.isPending ? 'Guardando…' : 'Registrar movimiento'}
        </Text>
      </TouchableOpacity>
    </FormModal>
  )
}

function ProductFormModal({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const createProduct = useCreateProduct()
  const { data: brands } = useBrands()
  const { data: units } = useUnits()
  const { data: families } = useProductFamilies()
  const { data: categories } = useCategories()
  const createBrand = useCreateBrand()
  const createUnit = useCreateUnit()
  const createFamily = useCreateProductFamily()
  const createCategory = useCreateCategory()

  const [searchTerm, setSearchTerm] = useState('')
  const { data: matches, isFetching: searching } = useSearchCatalogProducts(searchTerm)
  const [selectedMatch, setSelectedMatch] = useState<CatalogProductMatch | null>(null)

  const [form, setForm] = useState({
    barcode: '',
    name: '',
    brandId: null as string | null,
    unitId: null as string | null,
    familyId: null as string | null,
    categoryId: null as string | null,
    salePrice: '',
    purchasePrice: '',
    minimumStock: '0',
    initialStock: '0',
  })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  const usingExisting = !!selectedMatch
  const isDirty =
    usingExisting ||
    searchTerm.trim() !== '' ||
    form.barcode.trim() !== '' ||
    form.name.trim() !== '' ||
    form.salePrice !== '' ||
    form.purchasePrice !== '' ||
    form.minimumStock !== '0' ||
    form.initialStock !== '0'

  function handlePickMatch(match: CatalogProductMatch) {
    setSelectedMatch(match)
    setForm((p) => ({ ...p, name: match.name, barcode: match.barcode ?? '' }))
  }

  function handleCreate() {
    if (!usingExisting && (!form.name.trim() || !form.unitId)) return
    if (!form.salePrice) return
    setFeedback(null)
    createProduct.mutate(
      {
        productId: selectedMatch?.id ?? null,
        barcode: form.barcode.trim(),
        name: form.name.trim(),
        brandId: form.brandId,
        unitId: form.unitId,
        familyId: form.familyId,
        categoryId: form.categoryId,
        salePrice: Number(form.salePrice),
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        minimumStock: Number(form.minimumStock) || 0,
        branchId,
        initialStock: Number(form.initialStock) || 0,
      },
      {
        onSuccess: () => onClose(),
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo agregar el producto',
          }),
      },
    )
  }

  return (
    <FormModal title="Nuevo producto" onClose={onClose} isDirty={isDirty}>
      {!usingExisting && (
        <View>
          <Text style={styles.label}>Buscar producto ya existente (nombre o código de barras)</Text>
          <TextInput
            style={styles.input}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Ej. Shampoo 400ml o el código de barras"
            placeholderTextColor="#94a3b8"
          />
          {searchTerm.trim().length >= 2 && (
            <View style={styles.matchList}>
              {searching && <Text style={styles.emptyText}>Buscando…</Text>}
              {matches?.map((match) =>
                match.owned ? (
                  <View key={match.id} style={styles.matchOwned}>
                    <Text style={styles.matchOwnedText}>{match.name} — ya está en tu inventario</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    key={match.id}
                    style={styles.matchOption}
                    onPress={() => handlePickMatch(match)}
                  >
                    <Text style={styles.matchOptionText}>
                      {match.name}
                      {match.brandName ? ` · ${match.brandName}` : ''}
                    </Text>
                    <Text style={styles.cardCaption}>{match.unitName}</Text>
                  </TouchableOpacity>
                ),
              )}
              {matches?.length === 0 && !searching && (
                <Text style={styles.emptyText}>
                  No hay ningún producto así en la plataforma todavía — llena los datos abajo para
                  crearlo.
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {usingExisting && (
        <View style={styles.reuseBox}>
          <View style={styles.cardTopInfo}>
            <Text style={styles.reuseTitle}>{selectedMatch!.name}</Text>
            <Text style={styles.cardCaption}>
              Reutilizando este producto del catálogo — solo defines tu precio y stock.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSelectedMatch(null)
              setForm((p) => ({ ...p, name: '', barcode: '' }))
            }}
          >
            <Text style={styles.changeLink}>Cambiar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!usingExisting && (
        <View>
          <Text style={styles.label}>Código de barras (opcional)</Text>
          <TextInput
            style={styles.input}
            value={form.barcode}
            onChangeText={(v) => setForm((p) => ({ ...p, barcode: v }))}
          />
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
          />
          <ComboCreateSelect
            label="Marca"
            items={brands ?? []}
            value={form.brandId}
            onChange={(id) => setForm((p) => ({ ...p, brandId: id }))}
            onCreate={(name) => createBrand.mutateAsync(name)}
            placeholder="Buscar o crear marca"
          />
          <ComboCreateSelect
            label="Unidad"
            items={units ?? []}
            value={form.unitId}
            onChange={(id) => setForm((p) => ({ ...p, unitId: id }))}
            onCreate={(name) => createUnit.mutateAsync(name)}
            placeholder="Buscar o crear unidad"
          />
          <ComboCreateSelect
            label="Familia (opcional, para presentaciones)"
            items={families ?? []}
            value={form.familyId}
            onChange={(id) => setForm((p) => ({ ...p, familyId: id }))}
            onCreate={(name) => createFamily.mutateAsync(name)}
            placeholder="Ej. Refresco Cola"
          />
        </View>
      )}

      <ComboCreateSelect
        label="Categoría (opcional)"
        items={categories ?? []}
        value={form.categoryId}
        onChange={(id) => setForm((p) => ({ ...p, categoryId: id }))}
        onCreate={(name) => createCategory.mutateAsync(name)}
        placeholder="Buscar o crear categoría"
      />

      <View style={styles.row2}>
        <View style={styles.rowField}>
          <Text style={styles.label}>Precio de venta</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={form.salePrice}
            onChangeText={(v) => setForm((p) => ({ ...p, salePrice: v }))}
          />
        </View>
        <View style={styles.rowField}>
          <Text style={styles.label}>Precio de compra</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={form.purchasePrice}
            onChangeText={(v) => setForm((p) => ({ ...p, purchasePrice: v }))}
          />
        </View>
      </View>
      <View style={styles.row2}>
        <View style={styles.rowField}>
          <Text style={styles.label}>Stock mínimo</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={form.minimumStock}
            onChangeText={(v) => setForm((p) => ({ ...p, minimumStock: v }))}
          />
        </View>
        <View style={styles.rowField}>
          <Text style={styles.label}>Stock inicial en esta sucursal</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={form.initialStock}
            onChangeText={(v) => setForm((p) => ({ ...p, initialStock: v }))}
          />
        </View>
      </View>

      {feedback && (
        <Text style={feedback.type === 'success' ? styles.textSuccess : styles.textDanger}>
          {feedback.text}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.saveButton,
          (createProduct.isPending ||
            (!usingExisting && (!form.name.trim() || !form.unitId)) ||
            !form.salePrice) &&
            styles.disabled,
        ]}
        disabled={
          createProduct.isPending ||
          (!usingExisting && (!form.name.trim() || !form.unitId)) ||
          !form.salePrice
        }
        onPress={handleCreate}
      >
        <Text style={styles.saveButtonText}>
          {createProduct.isPending ? 'Agregando…' : 'Agregar producto'}
        </Text>
      </TouchableOpacity>
    </FormModal>
  )
}

function ServicesSection() {
  const { data: services, isLoading } = useServicesAdmin()
  const createService = useCreateService()

  const [form, setForm] = useState({ name: '', price: '', durationMinutes: '' })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleCreate() {
    if (!form.name.trim() || !form.price) return
    setFeedback(null)
    createService.mutate(
      {
        name: form.name.trim(),
        price: Number(form.price),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
      },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', text: 'Servicio agregado' })
          setForm({ name: '', price: '', durationMinutes: '' })
        },
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo agregar el servicio',
          }),
      },
    )
  }

  return (
    <FlatList
      style={styles.section}
      contentContainerStyle={styles.list}
      data={services ?? []}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Servicios</Text>
          <Text style={styles.sectionSubtitle}>
            Los servicios no manejan stock — solo precio y duración.
          </Text>
          {isLoading && <ActivityIndicator style={styles.loading} color="#2563eb" />}
        </View>
      }
      renderItem={({ item }) => <ServiceCard service={item} />}
      ListEmptyComponent={
        !isLoading ? (
          <Text style={styles.emptyText}>Aún no tienes servicios registrados.</Text>
        ) : null
      }
      ListFooterComponent={
        <View style={[styles.card, styles.newServiceCard]}>
          <Text style={styles.cardName}>Nuevo servicio</Text>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
          />
          <View style={styles.row2}>
            <View style={styles.rowField}>
              <Text style={styles.label}>Precio</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={form.price}
                onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
              />
            </View>
            <View style={styles.rowField}>
              <Text style={styles.label}>Duración (min)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={form.durationMinutes}
                onChangeText={(v) => setForm((p) => ({ ...p, durationMinutes: v }))}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (createService.isPending || !form.name.trim() || !form.price) && styles.disabled,
            ]}
            disabled={createService.isPending || !form.name.trim() || !form.price}
            onPress={handleCreate}
          >
            <Text style={styles.saveButtonText}>
              {createService.isPending ? 'Agregando…' : 'Agregar servicio'}
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

function ServiceCard({ service }: { service: ServiceItem }) {
  const updateService = useUpdateService()
  const [form, setForm] = useState({
    name: service.name,
    price: String(service.price),
    durationMinutes: service.durationMinutes != null ? String(service.durationMinutes) : '',
    active: service.active,
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)

  const dirty =
    form.name !== service.name ||
    form.price !== String(service.price) ||
    form.durationMinutes !==
      (service.durationMinutes != null ? String(service.durationMinutes) : '') ||
    form.active !== service.active

  function handleSave() {
    setFeedback(null)
    updateService.mutate(
      {
        id: service.id,
        name: form.name.trim(),
        price: Number(form.price) || 0,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        active: form.active,
      },
      { onSuccess: () => setFeedback('success'), onError: () => setFeedback('error') },
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <TextInput
          style={[styles.input, styles.cardTopInfo]}
          value={form.name}
          onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
        />
        <Switch value={form.active} onValueChange={(v) => setForm((p) => ({ ...p, active: v }))} />
      </View>
      <View style={styles.row2}>
        <View style={styles.rowField}>
          <Text style={styles.label}>Precio</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={form.price}
            onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
          />
        </View>
        <View style={styles.rowField}>
          <Text style={styles.label}>Duración (min)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={form.durationMinutes}
            onChangeText={(v) => setForm((p) => ({ ...p, durationMinutes: v }))}
          />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.saveButton, (!dirty || updateService.isPending) && styles.disabled]}
        disabled={!dirty || updateService.isPending}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>
          {updateService.isPending ? 'Guardando…' : 'Guardar'}
        </Text>
      </TouchableOpacity>
      {feedback === 'success' && <Text style={styles.textSuccess}>Guardado</Text>}
      {feedback === 'error' && <Text style={styles.textDanger}>Error al guardar</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  section: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  loading: {
    marginVertical: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
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
    gap: 8,
  },
  newServiceCard: {
    borderStyle: 'dashed',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTopInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardCaption: {
    fontSize: 12,
    color: '#94a3b8',
  },
  label: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 8,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  adjustLink: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  disabled: {
    opacity: 0.5,
  },
  textSuccess: {
    color: '#16a34a',
    fontSize: 12,
  },
  textDanger: {
    color: '#dc2626',
    fontSize: 12,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748b',
  },
  paginationBlock: {
    marginTop: 4,
    gap: 10,
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageSizeChip: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pageSizeChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pageSizeChipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  pageSizeChipTextActive: {
    color: '#fff',
  },
  totalText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#94a3b8',
  },
  pagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagerButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pagerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pagerLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  matchList: {
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  matchOwned: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
  matchOwnedText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  matchOption: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
  matchOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  reuseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  reuseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  changeLink: {
    fontSize: 12,
    color: '#64748b',
  },
})
