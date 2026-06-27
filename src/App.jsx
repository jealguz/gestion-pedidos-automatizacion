import { useState, useEffect, useCallback, useMemo } from 'react'

const ESTADOS = ['en preparacion', 'terminado', 'entregado']

// En desarrollo (.env.local): VITE_API_URL=/api → Vite proxy lo reenvía
// En producción (Netlify):    VITE_API_URL=https://tu-worker/?target=...
const API_URL = import.meta.env.VITE_API_URL

const BADGES = {
  'en preparacion': 'bg-amber-100 text-amber-800 border-amber-300',
  'terminado': 'bg-sky-100 text-sky-800 border-sky-300',
  'entregado': 'bg-emerald-100 text-emerald-800 border-emerald-300',
}

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function Modal({ pedido, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const filas = [
    { label: 'ID Pedido', valor: `#${pedido.ID_Pedido}` },
    { label: 'Fecha y Hora', valor: pedido.Fecha_Hora },
    { label: 'Nombre del Cliente', valor: pedido.Nombre_Cliente },
    { label: 'Teléfono', valor: pedido.Telefono },
    { label: 'Detalle del Pedido', valor: pedido.Detalle_Pedido },
    { label: 'Total del Pedido', valor: `$${Number(pedido.Total_Pedido).toLocaleString('es-CL')}` },
    { label: 'Dirección de Entrega', valor: pedido.Direccion_Entrega },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
      <div
        className="relative w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl mx-4 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Detalle del Pedido</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-0 px-6 py-4">
          {filas.map((f, i) => (
            <div key={i} className={classNames(
              'flex flex-col gap-0.5 py-3',
              i < filas.length - 1 && 'border-b border-gray-50'
            )}>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{f.label}</span>
              <span className="text-sm font-medium text-gray-900">{f.valor || '—'}</span>
            </div>
          ))}
          <div className="flex flex-col gap-0.5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Estado</span>
            <span className={classNames(
              'inline-flex self-start rounded-full border px-3 py-1 text-xs font-medium mt-1',
              BADGES[pedido.Estado] || 'bg-gray-100 text-gray-700 border-gray-200'
            )}>
              {pedido.Estado}
            </span>
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [actualizandoId, setActualizandoId] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null)

  const obtenerPedidos = useCallback(async () => {
    try {
      setCargando(true)
      setError('')
      if (!API_URL) {
        throw new Error('VITE_API_URL no está configurada. En Netlify, ve a Site settings → Environment variables y agrega VITE_API_URL con la URL de tu proxy CORS.')
      }
      const res = await fetch(API_URL)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
      }
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Error al obtener pedidos')
      setPedidos(json.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { obtenerPedidos() }, [obtenerPedidos])

  const cambiarEstado = async (id, nuevoEstado) => {
    setActualizandoId(id)
    const anterior = pedidos.find(p => p.ID_Pedido === id)?.Estado
    setPedidos(prev =>
      prev.map(p => (p.ID_Pedido === id ? { ...p, Estado: nuevoEstado } : p))
    )
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ ID_Pedido: id, Estado: nuevoEstado }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
      }
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Error al actualizar')
    } catch (err) {
      setPedidos(prev =>
        prev.map(p => (p.ID_Pedido === id ? { ...p, Estado: anterior } : p))
      )
      alert('Error al actualizar: ' + err.message)
    } finally {
      setActualizandoId(null)
    }
  }

  const filtrados = useMemo(() => {
    let resultado = [...pedidos]
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      resultado = resultado.filter(p =>
        String(p.ID_Pedido).toLowerCase().includes(q) ||
        String(p.Nombre_Cliente || '').toLowerCase().includes(q) ||
        String(p.Telefono || '').includes(q)
      )
    }
    if (filtroEstado) {
      resultado = resultado.filter(p => p.Estado === filtroEstado)
    }
    return resultado
  }, [pedidos, busqueda, filtroEstado])

  const stats = useMemo(() => ({
    total: pedidos.length,
    en_preparacion: pedidos.filter(p => p.Estado === 'en preparacion').length,
    terminado: pedidos.filter(p => p.Estado === 'terminado').length,
    entregado: pedidos.filter(p => p.Estado === 'entregado').length,
  }), [pedidos])

  const handleRowClick = (pedido) => {
    setPedidoSeleccionado(pedido)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-red-700 via-red-600 to-red-500 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold text-white">
              P
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">GESTIÓN DE PEDIDOS</h1>
              <p className="text-xs text-red-100 hidden sm:block">Panel de control</p>
            </div>
          </div>
          <button
            onClick={obtenerPedidos}
            disabled={cargando}
            className="flex items-center gap-2 rounded-lg bg-white/15 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition hover:bg-white/25 disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{cargando ? 'Cargando...' : 'Actualizar'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 sm:space-y-6 px-4 sm:px-6 py-4 sm:py-6">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 sm:px-5 py-4 text-sm text-red-800 shadow-sm">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">{error}</div>
            <button onClick={obtenerPedidos} className="font-medium text-red-700 underline hover:text-red-900">Reintentar</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { label: 'Total', valor: stats.total, color: 'bg-red-600', icono: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { label: 'Prep.', valor: stats.en_preparacion, color: 'bg-amber-500', icono: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Term.', valor: stats.terminado, color: 'bg-sky-500', icono: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Entreg.', valor: stats.entregado, color: 'bg-emerald-500', icono: 'M5 13l4 4L19 7' },
          ].map((s, i) => (
            <div key={i} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md">
              <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
                <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${s.color} shadow-sm`}>
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icono} />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">{s.label}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${s.color.replace('bg-', 'text-')}`}>{s.valor}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
              </div>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
              >
                <option value="">Todos</option>
                {ESTADOS.map(est => (
                  <option key={est} value={est}>{est}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 sm:text-right">
              {filtrados.length} de {pedidos.length}
            </p>
          </div>

          {cargando ? (
            <div className="space-y-3 p-4 sm:p-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-3 text-sm text-gray-500">No se encontraron pedidos</p>
              <button
                onClick={() => { setBusqueda(''); setFiltroEstado('') }}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              {/* ---- Vista Mobile: tarjetas ---- */}
              <div className="divide-y divide-gray-100 sm:hidden">
                {filtrados.map(pedido => (
                  <div key={pedido.ID_Pedido} className="p-4">
                    <div className="flex items-start justify-between" onClick={() => handleRowClick(pedido)}>
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-red-600">#{pedido.ID_Pedido}</span>
                          <span className={classNames(
                            'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            BADGES[pedido.Estado] || 'bg-gray-100 text-gray-700 border-gray-200'
                          )}>
                            {pedido.Estado}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 truncate">{pedido.Nombre_Cliente}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{pedido.Detalle_Pedido}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span>{pedido.Fecha_Hora}</span>
                          <span className="font-semibold text-gray-800">${Number(pedido.Total_Pedido).toLocaleString('es-CL')}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <select
                          value={pedido.Estado}
                          disabled={actualizandoId === pedido.ID_Pedido}
                          onChange={e => cambiarEstado(pedido.ID_Pedido, e.target.value)}
                          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 outline-none transition hover:border-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:cursor-wait disabled:opacity-50"
                        >
                          {ESTADOS.map(est => (
                            <option key={est} value={est}>{est}</option>
                          ))}
                        </select>
                        {actualizandoId === pedido.ID_Pedido && (
                          <svg className="ml-1 h-3 w-3 animate-spin text-red-500 inline" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ---- Vista Desktop: tabla ---- */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      {['ID Pedido', 'Fecha', 'Cliente', 'Teléfono', 'Detalle', 'Total', 'Dirección', 'Estado', 'Acción'].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtrados.map((pedido, idx) => (
                      <tr
                        key={pedido.ID_Pedido}
                        onClick={() => handleRowClick(pedido)}
                        className={classNames(
                          'cursor-pointer transition hover:bg-red-50/50',
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 text-sm font-semibold text-red-600">
                          #{pedido.ID_Pedido}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-600">
                          {pedido.Fecha_Hora}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <div className="text-sm font-medium text-gray-900">{pedido.Nombre_Cliente}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-gray-600">
                          {pedido.Telefono}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3.5 text-sm text-gray-600">
                          {pedido.Detalle_Pedido}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-sm font-semibold text-gray-900">
                          ${Number(pedido.Total_Pedido).toLocaleString('es-CL')}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3.5 text-sm text-gray-600">
                          {pedido.Direccion_Entrega}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <span className={classNames(
                            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                            BADGES[pedido.Estado] || 'bg-gray-100 text-gray-700 border-gray-200'
                          )}>
                            {pedido.Estado}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="relative flex items-center gap-1">
                            <select
                              value={pedido.Estado}
                              disabled={actualizandoId === pedido.ID_Pedido}
                              onChange={e => cambiarEstado(pedido.ID_Pedido, e.target.value)}
                              className="cursor-pointer rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 pr-7 text-xs font-medium text-gray-700 outline-none transition hover:border-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:cursor-wait disabled:opacity-50"
                            >
                              {ESTADOS.map(est => (
                                <option key={est} value={est}>{est}</option>
                              ))}
                            </select>
                            {actualizandoId === pedido.ID_Pedido && (
                              <svg className="h-4 w-4 animate-spin text-red-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {pedidoSeleccionado && (
        <Modal pedido={pedidoSeleccionado} onClose={() => setPedidoSeleccionado(null)} />
      )}
    </div>
  )
}

export default App
