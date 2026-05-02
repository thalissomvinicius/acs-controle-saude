import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Baby,
  CalendarCheck,
  ClipboardList,
  Download,
  Edit3,
  FileSpreadsheet,
  HeartPulse,
  Home,
  LogOut,
  MapPinned,
  Menu,
  Pill,
  Search,
  Settings,
  ShieldCheck,
  Syringe,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase, supabaseConfigurado } from './lib/supabase'
import './App.css'

type StatusVisita = 'em_dia' | 'pendente' | 'atrasada'
type StatusRegistro = 'concluida' | 'pendente' | 'retorno_necessario'
type Tela =
  | 'dashboard'
  | 'logradouros'
  | 'familias'
  | 'moradores'
  | 'visitas'
  | 'indicadores'
  | 'relatorios'
  | 'configuracoes'

type EntityId = string | number

type Logradouro = {
  id: EntityId
  bairro: string
  nome: string
  tipo: string
  quantidadeImoveis: number
  observacoes: string
}

type Familia = {
  id: EntityId
  logradouroId: EntityId
  numero: string
  tipoImovel: string
  nome: string
  responsavel: string
  telefone: string
  quantidadeMoradores: number
  situacaoMoradia: string
  observacoes: string
  ultimaVisita: string
  status: StatusVisita
}

type Morador = {
  id: EntityId
  familiaId: EntityId
  nome: string
  cpf: string
  cns: string
  nis: string
  nascimento: string
  sexo: string
  telefone: string
  peso: string
  altura: string
  responsavelFamiliar: boolean
  bolsaFamilia: boolean
  gestante: boolean
  preNatalEmDia: boolean
  hipertenso: boolean
  diabetico: boolean
  remedioControlado: boolean
  medicamento: string
  vacinaEmDia: boolean
  observacoes: string
}

type Visita = {
  id: EntityId
  familiaId: EntityId
  data: string
  acs: string
  pessoasEncontradas: string
  condicoes: string
  vacinaAtualizada: boolean
  preNatalAtualizado: boolean
  medicamentoConfirmado: boolean
  observacoes: string
  proximaVisita: string
  status: StatusRegistro
}

const hoje = new Date()
const isoHoje = hoje.toISOString().slice(0, 10)
const PRAZO_VISITA_DIAS = 30

const logradourosIniciais: Logradouro[] = [
  { id: 1, bairro: 'Tucano', nome: 'Nove de Junho', tipo: 'Rua', quantidadeImoveis: 16, observacoes: 'Area central da microarea.' },
  { id: 2, bairro: 'Tucano', nome: 'Travessa 04', tipo: 'Travessa', quantidadeImoveis: 20, observacoes: 'Muitas familias com idosos.' },
  { id: 3, bairro: 'Posto da Feira', nome: 'do Hospital', tipo: 'Rua', quantidadeImoveis: 8, observacoes: 'Proximo a UBS.' },
]

const familiasIniciais: Familia[] = [
  {
    id: 1,
    logradouroId: 1,
    numero: '01',
    tipoImovel: 'Casa',
    nome: 'Familia Silva',
    responsavel: 'Eder Belem da Silva',
    telefone: '(92) 98888-0001',
    quantidadeMoradores: 4,
    situacaoMoradia: 'Propria',
    observacoes: 'Acompanhar hipertensao e vacina infantil.',
    ultimaVisita: '2026-04-14',
    status: 'pendente',
  },
  {
    id: 2,
    logradouroId: 2,
    numero: '04',
    tipoImovel: 'Casa',
    nome: 'Familia Dalmasso',
    responsavel: 'Maria da Penha Salomon Dalmasso',
    telefone: '(92) 98888-0002',
    quantidadeMoradores: 3,
    situacaoMoradia: 'Alugada',
    observacoes: 'Gestante em acompanhamento.',
    ultimaVisita: '2026-03-20',
    status: 'atrasada',
  },
  {
    id: 3,
    logradouroId: 3,
    numero: '06',
    tipoImovel: 'Casa',
    nome: 'Familia Freitas',
    responsavel: 'Francisca do Nascimento Freitas',
    telefone: '(92) 98888-0003',
    quantidadeMoradores: 5,
    situacaoMoradia: 'Cedida',
    observacoes: 'Bolsa Familia e remedio controlado.',
    ultimaVisita: '2026-04-23',
    status: 'em_dia',
  },
]

const moradoresIniciais: Morador[] = [
  {
    id: 1,
    familiaId: 1,
    nome: 'Eder Belem da Silva',
    cpf: '111.222.333-44',
    cns: '700000000000001',
    nis: '12345678901',
    nascimento: '1972-08-12',
    sexo: 'Masculino',
    telefone: '(92) 98888-0001',
    peso: '82',
    altura: '1.71',
    responsavelFamiliar: true,
    bolsaFamilia: true,
    gestante: false,
    preNatalEmDia: true,
    hipertenso: true,
    diabetico: false,
    remedioControlado: true,
    medicamento: 'Losartana',
    vacinaEmDia: true,
    observacoes: 'Acompanhar pressao arterial.',
  },
  {
    id: 2,
    familiaId: 1,
    nome: 'Lia Silva',
    cpf: '222.333.444-55',
    cns: '700000000000002',
    nis: '12345678902',
    nascimento: '2025-01-15',
    sexo: 'Feminino',
    telefone: '',
    peso: '10',
    altura: '0.78',
    responsavelFamiliar: false,
    bolsaFamilia: true,
    gestante: false,
    preNatalEmDia: true,
    hipertenso: false,
    diabetico: false,
    remedioControlado: false,
    medicamento: '',
    vacinaEmDia: false,
    observacoes: 'Vacina pendente.',
  },
  {
    id: 3,
    familiaId: 2,
    nome: 'Maria da Penha Salomon Dalmasso',
    cpf: '333.444.555-66',
    cns: '700000000000003',
    nis: '12345678903',
    nascimento: '1998-05-20',
    sexo: 'Feminino',
    telefone: '(92) 98888-0002',
    peso: '69',
    altura: '1.62',
    responsavelFamiliar: true,
    bolsaFamilia: false,
    gestante: true,
    preNatalEmDia: false,
    hipertenso: false,
    diabetico: false,
    remedioControlado: false,
    medicamento: '',
    vacinaEmDia: true,
    observacoes: 'Pre-natal pendente.',
  },
  {
    id: 4,
    familiaId: 3,
    nome: 'Francisca do Nascimento Freitas',
    cpf: '444.555.666-77',
    cns: '700000000000004',
    nis: '12345678904',
    nascimento: '1950-02-10',
    sexo: 'Feminino',
    telefone: '(92) 98888-0003',
    peso: '74',
    altura: '1.57',
    responsavelFamiliar: true,
    bolsaFamilia: true,
    gestante: false,
    preNatalEmDia: true,
    hipertenso: true,
    diabetico: true,
    remedioControlado: true,
    medicamento: 'Metformina, Losartana',
    vacinaEmDia: false,
    observacoes: 'Prioridade por hipertensao, diabetes e vacina.',
  },
]

const visitasIniciais: Visita[] = [
  {
    id: 1,
    familiaId: 1,
    data: '2026-04-14',
    acs: 'Adriellen Guimaraes',
    pessoasEncontradas: 'Eder e Lia',
    condicoes: 'Hipertensao, crianca 0 a 2 anos',
    vacinaAtualizada: false,
    preNatalAtualizado: true,
    medicamentoConfirmado: true,
    observacoes: 'Orientada atualizacao vacinal.',
    proximaVisita: '2026-05-05',
    status: 'retorno_necessario',
  },
  {
    id: 2,
    familiaId: 2,
    data: '2026-03-20',
    acs: 'Adriellen Guimaraes',
    pessoasEncontradas: 'Maria',
    condicoes: 'Gestante',
    vacinaAtualizada: true,
    preNatalAtualizado: false,
    medicamentoConfirmado: false,
    observacoes: 'Agendar pre-natal.',
    proximaVisita: '2026-04-03',
    status: 'pendente',
  },
]

const menus = [
  { id: 'dashboard' as Tela, label: 'Inicio', icon: Activity },
  { id: 'logradouros' as Tela, label: 'Logradouros', icon: MapPinned },
  { id: 'familias' as Tela, label: 'Familias', icon: Home },
  { id: 'moradores' as Tela, label: 'Moradores', icon: UsersRound },
  { id: 'visitas' as Tela, label: 'Visitas', icon: CalendarCheck },
  { id: 'indicadores' as Tela, label: 'Indicadores', icon: HeartPulse },
  { id: 'relatorios' as Tela, label: 'Relatorios', icon: ClipboardList },
  { id: 'configuracoes' as Tela, label: 'Configuracoes', icon: Settings },
]

function calcularIdade(nascimento: string) {
  const data = new Date(`${nascimento}T00:00:00`)
  let idade = hoje.getFullYear() - data.getFullYear()
  const mes = hoje.getMonth() - data.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) idade -= 1
  return idade
}

function diasDesde(data: string) {
  const alvo = new Date(`${data}T00:00:00`)
  return Math.max(0, Math.floor((hoje.getTime() - alvo.getTime()) / 86_400_000))
}

function adicionarDias(data: string, dias: number) {
  const alvo = new Date(`${data}T00:00:00`)
  alvo.setUTCDate(alvo.getUTCDate() + dias)
  return alvo.toISOString().slice(0, 10)
}

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${data}T00:00:00`))
}

function statusVisitaAutomatico(dataUltimaVisita: string, statusAtual: StatusVisita = 'pendente'): StatusVisita {
  if (!dataUltimaVisita) return statusAtual
  const dias = diasDesde(dataUltimaVisita)
  if (dias > PRAZO_VISITA_DIAS) return 'atrasada'
  if (dias === PRAZO_VISITA_DIAS) return 'pendente'
  return 'em_dia'
}

function statusFamiliaAposRegistro(status: StatusRegistro): StatusVisita {
  return status === 'concluida' ? 'em_dia' : 'pendente'
}

function escaparCelula(valor: string | number) {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function fraseQuantidade(total: number, singular: string, plural: string) {
  return `${total} ${total === 1 ? singular : plural}`
}

function normalizarBusca(valor: string) {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function correspondeBusca(valor: string, termo: string) {
  const texto = normalizarBusca(valor)
  if (termo.length <= 3) {
    return texto
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .some((palavra) => palavra.startsWith(termo))
  }
  return texto.includes(termo)
}

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? (JSON.parse(saved) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

type SupabaseUser = {
  id: string
  email?: string
}

function mapLogradouro(row: Record<string, unknown>): Logradouro {
  return {
    id: String(row.id),
    bairro: String(row.bairro ?? ''),
    nome: String(row.nome ?? ''),
    tipo: String(row.tipo ?? 'Rua'),
    quantidadeImoveis: Number(row.quantidade_imoveis ?? 0),
    observacoes: String(row.observacoes ?? ''),
  }
}

function mapFamilia(row: Record<string, unknown>): Familia {
  return {
    id: String(row.id),
    logradouroId: String(row.logradouro_id),
    numero: String(row.numero_casa ?? ''),
    tipoImovel: String(row.tipo_imovel ?? 'Casa'),
    nome: String(row.nome_familia ?? ''),
    responsavel: String(row.responsavel_familiar ?? ''),
    telefone: String(row.telefone ?? ''),
    quantidadeMoradores: Number(row.quantidade_moradores ?? 0),
    situacaoMoradia: String(row.situacao_moradia ?? ''),
    observacoes: String(row.observacoes ?? ''),
    ultimaVisita: String(row.data_ultima_visita ?? ''),
    status: String(row.status_visita ?? 'pendente') as StatusVisita,
  }
}

function mapMorador(row: Record<string, unknown>): Morador {
  return {
    id: String(row.id),
    familiaId: String(row.familia_id),
    nome: String(row.nome_completo ?? ''),
    cpf: String(row.cpf ?? ''),
    cns: String(row.cns ?? ''),
    nis: String(row.nis ?? ''),
    nascimento: String(row.data_nascimento ?? ''),
    sexo: String(row.sexo ?? ''),
    telefone: String(row.telefone ?? ''),
    peso: String(row.peso ?? ''),
    altura: String(row.altura ?? ''),
    responsavelFamiliar: Boolean(row.responsavel_familiar),
    bolsaFamilia: Boolean(row.participa_bolsa_familia),
    gestante: Boolean(row.gestante),
    preNatalEmDia: Boolean(row.pre_natal_em_dia),
    hipertenso: Boolean(row.hipertenso),
    diabetico: Boolean(row.diabetico),
    remedioControlado: Boolean(row.usa_remedio_controlado),
    medicamento: '',
    vacinaEmDia: Boolean(row.vacina_em_dia),
    observacoes: String(row.observacoes_gerais ?? ''),
  }
}

function mapVisita(row: Record<string, unknown>): Visita {
  return {
    id: String(row.id),
    familiaId: String(row.familia_id),
    data: String(row.data_visita ?? ''),
    acs: String(row.acs_responsavel ?? ''),
    pessoasEncontradas: String(row.pessoas_encontradas ?? ''),
    condicoes: String(row.condicoes_acompanhadas ?? ''),
    vacinaAtualizada: Boolean(row.vacina_atualizada),
    preNatalAtualizado: Boolean(row.pre_natal_atualizado),
    medicamentoConfirmado: Boolean(row.medicamento_controlado_confirmado),
    observacoes: String(row.observacoes_visita ?? ''),
    proximaVisita: String(row.proxima_visita_recomendada ?? ''),
    status: String(row.status_visita ?? 'pendente') as StatusRegistro,
  }
}

function statusTexto(status: StatusVisita | StatusRegistro) {
  const mapa = {
    em_dia: 'Em dia',
    pendente: 'Pendente',
    atrasada: 'Atrasada',
    concluida: 'Concluida',
    retorno_necessario: 'Retorno necessario',
  }
  return mapa[status]
}

function App() {
  const [logado, setLogado] = useState(false)
  const [carregando, setCarregando] = useState(supabaseConfigurado)
  const [usuarioId, setUsuarioId] = useState('')
  const [erroLogin, setErroLogin] = useState('')
  const [tela, setTela] = useState<Tela>('dashboard')
  const [menuAberto, setMenuAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroRapido, setFiltroRapido] = useState('Mes')
  const [logradouros, setLogradouros] = usePersistentState('acs:logradouros', logradourosIniciais)
  const [familias, setFamilias] = usePersistentState('acs:familias', familiasIniciais)
  const [moradores, setMoradores] = usePersistentState('acs:moradores', moradoresIniciais)
  const [visitas, setVisitas] = usePersistentState('acs:visitas', visitasIniciais)
  const [grupoAtivo, setGrupoAtivo] = useState('Vacinas pendentes')
  const [logradouroEditando, setLogradouroEditando] = useState<Logradouro | null>(null)
  const [familiaEditando, setFamiliaEditando] = useState<Familia | null>(null)
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null)

  function navegarPara(proximaTela: Tela) {
    setTela(proximaTela)
    setMenuAberto(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editarFamilia(familia: Familia) {
    setFamiliaEditando(familia)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editarMorador(morador: Morador) {
    setMoradorEditando(morador)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const garantirPerfil = useCallback(async (user: SupabaseUser) => {
    if (!supabase || !user.email) return
    const nome = user.email.split('@')[0]
    const perfil = {
      id: user.id,
      nome,
      email: user.email,
      cargo: 'ACS',
      unidade_saude: 'Posto da Feira',
      microarea: 'Microarea principal',
      ativo: true,
    }

    const { error: insertError } = await supabase.from('usuarios').insert(perfil)
    if (!insertError) return

    if (insertError.code === '23505') {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          nome: perfil.nome,
          email: perfil.email,
          cargo: perfil.cargo,
          unidade_saude: perfil.unidade_saude,
          microarea: perfil.microarea,
          ativo: perfil.ativo,
        })
        .eq('id', user.id)
      if (!updateError) return
    }

    console.warn('Nao foi possivel sincronizar perfil do usuario:', insertError.message)
  }, [])

  const carregarDados = useCallback(async (userIdAtual: string) => {
    if (!supabase) return
    const [logradourosDb, familiasDb, moradoresDb, visitasDb, medicamentosDb] = await Promise.all([
      supabase.from('logradouros').select('*').eq('usuario_id', userIdAtual).order('criado_em', { ascending: true }),
      supabase.from('familias').select('*').eq('usuario_id', userIdAtual).order('criado_em', { ascending: true }),
      supabase.from('moradores').select('*').eq('usuario_id', userIdAtual).order('criado_em', { ascending: true }),
      supabase.from('visitas').select('*').eq('usuario_id', userIdAtual).order('data_visita', { ascending: false }),
      supabase.from('medicamentos').select('*').eq('usuario_id', userIdAtual).order('criado_em', { ascending: true }),
    ])

    const erro = logradourosDb.error || familiasDb.error || moradoresDb.error || visitasDb.error || medicamentosDb.error
    if (erro) throw erro

    const medicamentosPorMorador = new Map<string, string[]>()
    ;(medicamentosDb.data ?? []).forEach((medicamento) => {
      const moradorId = String(medicamento.morador_id)
      medicamentosPorMorador.set(moradorId, [...(medicamentosPorMorador.get(moradorId) ?? []), String(medicamento.nome_medicamento)])
    })

    setLogradouros((logradourosDb.data ?? []).map(mapLogradouro))
    setFamilias((familiasDb.data ?? []).map(mapFamilia))
    setMoradores((moradoresDb.data ?? []).map((morador) => {
      const mapeado = mapMorador(morador)
      mapeado.medicamento = (medicamentosPorMorador.get(String(mapeado.id)) ?? []).join(', ')
      return mapeado
    }))
    setVisitas((visitasDb.data ?? []).map(mapVisita))
  }, [setFamilias, setLogradouros, setMoradores, setVisitas])

  async function obterUsuarioAutenticado() {
    if (!supabase) return ''
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw new Error('Sessao expirada. Saia e entre novamente.')
    }
    if (data.user.id !== usuarioId) {
      setUsuarioId(data.user.id)
    }
    return data.user.id
  }

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth.getSession().then(async ({ data }) => {
      try {
        const user = data.session?.user
        if (user) {
          await garantirPerfil(user)
          setUsuarioId(user.id)
          setLogado(true)
          await carregarDados(user.id)
        }
      } catch (error) {
        setErroLogin(error instanceof Error ? error.message : 'Erro ao carregar dados do Supabase.')
      } finally {
        setCarregando(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      if (!user) {
        setUsuarioId('')
        setLogado(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [carregarDados, garantirPerfil])

  const familiasComEndereco = useMemo(
    () =>
      familias.map((familia) => {
        const logradouro = logradouros.find((item) => String(item.id) === String(familia.logradouroId))
        return {
          ...familia,
          status: statusVisitaAutomatico(familia.ultimaVisita, familia.status),
          endereco: `${logradouro?.tipo ?? 'Rua'} ${logradouro?.nome ?? ''}, ${familia.numero}`,
          bairro: logradouro?.bairro ?? '',
        }
      }),
    [familias, logradouros],
  )

  const moradoresDetalhados = useMemo(
    () =>
      moradores.map((morador) => {
        const familia = familiasComEndereco.find((item) => String(item.id) === String(morador.familiaId))
        const idade = calcularIdade(morador.nascimento)
        return {
          ...morador,
          idade,
          crianca: idade >= 0 && idade <= 2,
          idoso: idade >= 60,
          familia: familia?.nome ?? '',
          endereco: familia?.endereco ?? '',
          ultimaVisita: familia?.ultimaVisita ?? '',
          statusFamilia: familia?.status ?? 'pendente',
        }
      }),
    [moradores, familiasComEndereco],
  )

  const indicadores = useMemo(() => {
    const visitasMes = visitas.filter((visita) => visita.data.slice(0, 7) === isoHoje.slice(0, 7)).length
    return [
      { label: 'Total de familias', valor: familias.length, icon: Home, status: 'neutro' },
      { label: 'Total de moradores', valor: moradores.length, icon: UsersRound, status: 'neutro' },
      { label: 'Visitas no mes', valor: visitasMes, icon: CalendarCheck, status: 'ok' },
      { label: 'Visitas pendentes', valor: familiasComEndereco.filter((item) => item.status === 'pendente').length, icon: ClipboardList, status: 'atencao' },
      { label: 'Visitas atrasadas', valor: familiasComEndereco.filter((item) => item.status === 'atrasada').length, icon: AlertTriangle, status: 'risco' },
      { label: 'Gestantes', valor: moradores.filter((item) => item.gestante).length, icon: HeartPulse, status: 'atencao' },
      { label: 'Criancas 0 a 2', valor: moradoresDetalhados.filter((item) => item.crianca).length, icon: Baby, status: 'atencao' },
      { label: 'Idosos 60+', valor: moradoresDetalhados.filter((item) => item.idoso).length, icon: UserRound, status: 'neutro' },
      { label: 'Hipertensos', valor: moradores.filter((item) => item.hipertenso).length, icon: Activity, status: 'atencao' },
      { label: 'Diabeticos', valor: moradores.filter((item) => item.diabetico).length, icon: HeartPulse, status: 'atencao' },
      { label: 'Hipertensos e diabeticos', valor: moradores.filter((item) => item.hipertenso && item.diabetico).length, icon: ShieldCheck, status: 'risco' },
      { label: 'Bolsa Familia', valor: moradores.filter((item) => item.bolsaFamilia).length, icon: UsersRound, status: 'neutro' },
      { label: 'Remedio controlado', valor: moradores.filter((item) => item.remedioControlado).length, icon: Pill, status: 'atencao' },
      { label: 'Vacinas pendentes', valor: moradores.filter((item) => !item.vacinaEmDia).length, icon: Syringe, status: 'risco' },
      { label: 'Pre-natal pendente', valor: moradores.filter((item) => item.gestante && !item.preNatalEmDia).length, icon: Baby, status: 'risco' },
    ]
  }, [familias, familiasComEndereco, moradores, moradoresDetalhados, visitas])

  const resultadosBusca = useMemo(() => {
    const termo = normalizarBusca(busca.trim())
    if (!termo) return moradoresDetalhados
    return moradoresDetalhados.filter((morador) =>
      [
        morador.nome,
        morador.cpf,
        morador.cns,
        morador.nis,
        morador.familia.replace(/^familia\s+/i, ''),
        morador.endereco,
        morador.hipertenso ? 'hipertenso' : '',
        morador.diabetico ? 'diabetico' : '',
        morador.bolsaFamilia ? 'bolsa familia' : '',
      ].some((valor) => correspondeBusca(valor, termo)),
    )
  }, [busca, moradoresDetalhados])

  const listaGrupo = useMemo(() => {
    const filtros: Record<string, (item: (typeof moradoresDetalhados)[number]) => boolean> = {
      'Bolsa Familia': (item) => item.bolsaFamilia,
      Hipertensos: (item) => item.hipertenso,
      Diabeticos: (item) => item.diabetico,
      'Hipertensos e diabeticos': (item) => item.hipertenso && item.diabetico,
      'Idosos acima de 60 anos': (item) => item.idoso,
      Gestantes: (item) => item.gestante,
      'Criancas de 0 a 2 anos': (item) => item.crianca,
      'Pessoas com remedio controlado': (item) => item.remedioControlado,
      'Vacinas pendentes': (item) => !item.vacinaEmDia,
      'Pre-natal pendente': (item) => item.gestante && !item.preNatalEmDia,
      'Visitas atrasadas': (item) => item.statusFamilia === 'atrasada',
      'Visitas pendentes': (item) => item.statusFamilia === 'pendente',
    }
    return moradoresDetalhados.filter(filtros[grupoAtivo])
  }, [grupoAtivo, moradoresDetalhados])

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroLogin('')
    const dados = new FormData(event.currentTarget)
    const email = String(dados.get('usuario')).trim()
    const senha = String(dados.get('senha'))

    if (supabase) {
      setCarregando(true)
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
        if (!data.user) throw new Error('Login nao retornou usuario.')
        await garantirPerfil(data.user)
        setUsuarioId(data.user.id)
        setLogado(true)
        await carregarDados(data.user.id)
      } catch (error) {
        setErroLogin(error instanceof Error ? error.message : 'Nao foi possivel entrar.')
      } finally {
        setCarregando(false)
      }
      return
    }

    setLogado(true)
  }

  async function adicionarLogradouro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dados = new FormData(event.currentTarget)
    const novo = {
      bairro: String(dados.get('bairro')),
      nome: String(dados.get('nome')),
      tipo: String(dados.get('tipo')),
      quantidadeImoveis: Number(dados.get('quantidadeImoveis')),
      observacoes: String(dados.get('observacoes')),
    }

    if (supabase) {
      const usuarioAtual = await obterUsuarioAutenticado()
      const payload = {
        usuario_id: usuarioAtual,
        bairro: novo.bairro,
        nome: novo.nome,
        tipo: novo.tipo,
        quantidade_imoveis: novo.quantidadeImoveis,
        observacoes: novo.observacoes,
      }
      const query = logradouroEditando
        ? supabase.from('logradouros').update(payload).eq('id', logradouroEditando.id).select().single()
        : supabase.from('logradouros').insert(payload).select().single()
      const { data, error } = await query
      if (error) {
        alert(error.message)
        return
      }
      const salvo = mapLogradouro(data)
      setLogradouros((atuais) => logradouroEditando ? atuais.map((item) => String(item.id) === String(salvo.id) ? salvo : item) : [...atuais, salvo])
      setLogradouroEditando(null)
      event.currentTarget.reset()
      return
    }

    setLogradouros((atuais) =>
      logradouroEditando
        ? atuais.map((item) => String(item.id) === String(logradouroEditando.id) ? { ...item, ...novo } : item)
        : [
            ...atuais,
            {
              id: Date.now(),
              ...novo,
            },
          ],
    )
    setLogradouroEditando(null)
    event.currentTarget.reset()
  }

  async function excluirLogradouro(id: EntityId) {
    const confirmar = window.confirm('Excluir este logradouro? Familias vinculadas podem impedir a exclusao.')
    if (!confirmar) return

    if (supabase) {
      await obterUsuarioAutenticado()
      const { error } = await supabase.from('logradouros').delete().eq('id', id)
      if (error) {
        alert(error.message)
        return
      }
    }

    setLogradouros((atuais) => atuais.filter((item) => String(item.id) !== String(id)))
    if (logradouroEditando && String(logradouroEditando.id) === String(id)) {
      setLogradouroEditando(null)
    }
  }

  async function adicionarFamilia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dados = new FormData(event.currentTarget)
    const nova = {
      logradouroId: String(dados.get('logradouroId')),
      numero: String(dados.get('numero')),
      tipoImovel: String(dados.get('tipoImovel')),
      nome: String(dados.get('nome')),
      responsavel: String(dados.get('responsavel')),
      telefone: String(dados.get('telefone')),
      quantidadeMoradores: Number(dados.get('quantidadeMoradores')),
      situacaoMoradia: String(dados.get('situacaoMoradia')),
      observacoes: String(dados.get('observacoes')),
      ultimaVisita: String(dados.get('ultimaVisita') || isoHoje),
      status: String(dados.get('status') || 'pendente') as StatusVisita,
    }

    if (supabase) {
      const usuarioAtual = await obterUsuarioAutenticado()
      const payload = {
        usuario_id: usuarioAtual,
        logradouro_id: nova.logradouroId,
        numero_casa: nova.numero,
        tipo_imovel: nova.tipoImovel,
        nome_familia: nova.nome,
        responsavel_familiar: nova.responsavel,
        telefone: nova.telefone,
        quantidade_moradores: nova.quantidadeMoradores,
        situacao_moradia: nova.situacaoMoradia,
        observacoes: nova.observacoes,
        data_ultima_visita: nova.ultimaVisita || null,
        status_visita: nova.status,
      }
      const query = familiaEditando
        ? supabase.from('familias').update(payload).eq('id', familiaEditando.id).select().single()
        : supabase.from('familias').insert(payload).select().single()
      const { data, error } = await query
      if (error) {
        alert(error.message)
        return
      }
      const familiaSalva = mapFamilia(data)
      setFamilias((atuais) => familiaEditando ? atuais.map((item) => String(item.id) === String(familiaSalva.id) ? familiaSalva : item) : [...atuais, familiaSalva])
      setFamiliaEditando(null)
      event.currentTarget.reset()
      return
    }

    setFamilias((atuais) =>
      familiaEditando
        ? atuais.map((item) => String(item.id) === String(familiaEditando.id) ? { ...item, ...nova } : item)
        : [
            ...atuais,
            {
              id: Date.now(),
              ...nova,
            },
          ],
    )
    setFamiliaEditando(null)
    event.currentTarget.reset()
  }

  async function excluirFamilia(id: EntityId) {
    const confirmar = window.confirm('Excluir esta familia? Moradores e visitas vinculados podem ser removidos.')
    if (!confirmar) return

    if (supabase) {
      await obterUsuarioAutenticado()
      const { error } = await supabase.from('familias').delete().eq('id', id)
      if (error) {
        alert(error.message)
        return
      }
    }

    setFamilias((atuais) => atuais.filter((item) => String(item.id) !== String(id)))
    setMoradores((atuais) => atuais.filter((item) => String(item.familiaId) !== String(id)))
    setVisitas((atuais) => atuais.filter((item) => String(item.familiaId) !== String(id)))
    if (familiaEditando && String(familiaEditando.id) === String(id)) setFamiliaEditando(null)
  }

  async function adicionarMorador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dados = new FormData(event.currentTarget)
    const cpf = String(dados.get('cpf'))
    if (moradores.some((item) => item.cpf === cpf && String(item.id) !== String(moradorEditando?.id))) {
      alert('Ja existe um morador cadastrado com este CPF.')
      return
    }
    const novo = {
      familiaId: String(dados.get('familiaId')),
      nome: String(dados.get('nome')),
      cpf,
      cns: String(dados.get('cns')),
      nis: String(dados.get('nis')),
      nascimento: String(dados.get('nascimento')),
      sexo: String(dados.get('sexo')),
      telefone: String(dados.get('telefone')),
      peso: String(dados.get('peso')),
      altura: String(dados.get('altura')),
      responsavelFamiliar: dados.get('responsavelFamiliar') === 'on',
      bolsaFamilia: dados.get('bolsaFamilia') === 'on',
      gestante: dados.get('gestante') === 'on',
      preNatalEmDia: dados.get('preNatalEmDia') === 'on',
      hipertenso: dados.get('hipertenso') === 'on',
      diabetico: dados.get('diabetico') === 'on',
      remedioControlado: dados.get('remedioControlado') === 'on',
      medicamento: String(dados.get('medicamento')),
      vacinaEmDia: dados.get('vacinaEmDia') === 'on',
      observacoes: String(dados.get('observacoes')),
    }

    if (!novo.nascimento || novo.nascimento === 'null') {
      alert('Informe a data de nascimento do morador.')
      return
    }

    if (supabase) {
      const usuarioAtual = await obterUsuarioAutenticado()
      const payload = {
        usuario_id: usuarioAtual,
        familia_id: novo.familiaId,
        nome_completo: novo.nome,
        cpf: novo.cpf,
        cns: novo.cns,
        nis: novo.nis,
        data_nascimento: novo.nascimento,
        sexo: novo.sexo,
        telefone: novo.telefone,
        peso: novo.peso ? Number(novo.peso) : null,
        altura: novo.altura ? Number(novo.altura) : null,
        responsavel_familiar: novo.responsavelFamiliar,
        participa_bolsa_familia: novo.bolsaFamilia,
        gestante: novo.gestante,
        pre_natal_em_dia: novo.preNatalEmDia,
        hipertenso: novo.hipertenso,
        diabetico: novo.diabetico,
        usa_remedio_controlado: novo.remedioControlado,
        vacina_em_dia: novo.vacinaEmDia,
        observacoes_gerais: novo.observacoes,
      }
      const query = moradorEditando
        ? supabase.from('moradores').update(payload).eq('id', moradorEditando.id).select().single()
        : supabase.from('moradores').insert(payload).select().single()
      const { data, error } = await query
      if (error) {
        alert(error.message)
        return
      }
      const moradorSalvo = mapMorador(data)
      if (novo.remedioControlado && novo.medicamento) {
        const { data: remediosAtualizados } = await supabase
          .from('medicamentos')
          .update({ nome_medicamento: novo.medicamento, uso_continuo: true })
          .eq('usuario_id', usuarioAtual)
          .eq('morador_id', moradorSalvo.id)
          .select('id')
        if (!remediosAtualizados?.length) await supabase.from('medicamentos').insert({
          usuario_id: usuarioAtual,
          morador_id: moradorSalvo.id,
          nome_medicamento: novo.medicamento,
          uso_continuo: true,
        })
        moradorSalvo.medicamento = novo.medicamento
      } else if (moradorEditando) {
        await supabase.from('medicamentos').delete().eq('usuario_id', usuarioAtual).eq('morador_id', moradorSalvo.id)
      }
      setMoradores((atuais) => moradorEditando ? atuais.map((item) => String(item.id) === String(moradorSalvo.id) ? moradorSalvo : item) : [...atuais, moradorSalvo])
      setMoradorEditando(null)
      event.currentTarget.reset()
      return
    }

    setMoradores((atuais) =>
      moradorEditando
        ? atuais.map((item) => String(item.id) === String(moradorEditando.id) ? { ...item, ...novo } : item)
        : [
            ...atuais,
            {
              id: Date.now(),
              ...novo,
            },
          ],
    )
    setMoradorEditando(null)
    event.currentTarget.reset()
  }

  async function excluirMorador(id: EntityId) {
    const confirmar = window.confirm('Excluir este morador? O cadastro sera removido da familia.')
    if (!confirmar) return

    if (supabase) {
      await obterUsuarioAutenticado()
      const { error } = await supabase.from('moradores').delete().eq('id', id)
      if (error) {
        alert(error.message)
        return
      }
    }

    setMoradores((atuais) => atuais.filter((item) => String(item.id) !== String(id)))
    if (moradorEditando && String(moradorEditando.id) === String(id)) setMoradorEditando(null)
  }

  async function registrarVisita(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dados = new FormData(event.currentTarget)
    const familiaId = String(dados.get('familiaId'))
    const data = String(dados.get('data'))
    const nova = {
      familiaId,
      data,
      acs: String(dados.get('acs')),
      pessoasEncontradas: String(dados.get('pessoasEncontradas')),
      condicoes: String(dados.get('condicoes')),
      vacinaAtualizada: dados.get('vacinaAtualizada') === 'on',
      preNatalAtualizado: dados.get('preNatalAtualizado') === 'on',
      medicamentoConfirmado: dados.get('medicamentoConfirmado') === 'on',
      observacoes: String(dados.get('observacoes')),
      proximaVisita: String(dados.get('proximaVisita') || adicionarDias(data, PRAZO_VISITA_DIAS)),
      status: String(dados.get('status')) as StatusRegistro,
    }

    if (supabase) {
      const usuarioAtual = await obterUsuarioAutenticado()
      const { error } = await supabase.from('visitas').insert({
        usuario_id: usuarioAtual,
        familia_id: nova.familiaId,
        data_visita: nova.data,
        acs_responsavel: nova.acs,
        pessoas_encontradas: nova.pessoasEncontradas,
        condicoes_acompanhadas: nova.condicoes,
        vacina_atualizada: nova.vacinaAtualizada,
        pre_natal_atualizado: nova.preNatalAtualizado,
        medicamento_controlado_confirmado: nova.medicamentoConfirmado,
        observacoes_visita: nova.observacoes,
        proxima_visita_recomendada: nova.proximaVisita || null,
        status_visita: nova.status,
      })
      if (error) {
        alert(error.message)
        return
      }
      const { error: familiaError } = await supabase
        .from('familias')
        .update({
          data_ultima_visita: nova.data,
          status_visita: statusFamiliaAposRegistro(nova.status),
        })
        .eq('id', nova.familiaId)
        .eq('usuario_id', usuarioAtual)
      if (familiaError) {
        alert(familiaError.message)
        return
      }
      await carregarDados(usuarioAtual)
      event.currentTarget.reset()
      return
    }

    setVisitas((atuais) => [
      ...atuais,
      {
        id: Date.now(),
        ...nova,
      },
    ])
    setFamilias((atuais) =>
      atuais.map((familia) =>
        String(familia.id) === familiaId ? { ...familia, ultimaVisita: data, status: statusFamiliaAposRegistro(nova.status) } : familia,
      ),
    )
    event.currentTarget.reset()
  }

  async function sair() {
    if (supabase) await supabase.auth.signOut()
    setUsuarioId('')
    setLogado(false)
  }

  function exportarPDF() {
    const doc = new jsPDF()
    doc.text('ACS Controle Saude - Relatorio de indicadores', 14, 16)
    autoTable(doc, {
      head: [['Nome', 'CPF', 'Idade', 'Familia', 'Endereco', 'Pendencia']],
      body: listaGrupo.map((item) => [item.nome, item.cpf, item.idade, item.familia, item.endereco, pendenciaMorador(item)]),
      startY: 24,
    })
    doc.save('acs-controle-saude-relatorio.pdf')
  }

  function exportarExcel() {
    const linhas = listaGrupo
      .map(
        (item) => `
          <tr>
            <td>${escaparCelula(item.nome)}</td>
            <td>${escaparCelula(item.cpf)}</td>
            <td>${escaparCelula(item.idade)}</td>
            <td>${escaparCelula(item.familia)}</td>
            <td>${escaparCelula(item.endereco)}</td>
            <td>${escaparCelula(item.ultimaVisita)}</td>
            <td>${escaparCelula(pendenciaMorador(item))}</td>
          </tr>`,
      )
      .join('')
    const tabela = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Idade</th>
                <th>Familia</th>
                <th>Endereco</th>
                <th>Ultima visita</th>
                <th>Pendencia</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </body>
      </html>`
    const url = URL.createObjectURL(new Blob([tabela], { type: 'application/vnd.ms-excel;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'acs-controle-saude-relatorio.xls'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (carregando && !logado) {
    return (
      <main className="login-page">
        <section className="login-card animate-in">
          <div className="brand-mark">
            <Activity size={32} />
          </div>
          <p className="eyebrow">Conectando...</p>
          <h1>Carregando</h1>
          <p className="login-copy">Sincronizando com a base de dados do ACS...</p>
        </section>
      </main>
    )
  }

  if (!logado) {
    return (
      <main className="login-page">
        <section className="login-card animate-in">
          <div className="brand-mark">
            <Activity size={32} />
          </div>
          <p className="eyebrow">Sistema ACS</p>
          <h1>Bem-vindo</h1>
          <p className="login-copy">Gerencie visitas e indicadores com facilidade.</p>
          <form onSubmit={entrar} className="form-grid">
            <label>
              E-mail
              <input name="usuario" autoComplete="email" placeholder="drica@admin.com" type="email" required />
            </label>
            <label>
              Senha
              <input name="senha" type="password" autoComplete="current-password" placeholder="********" required />
            </label>
            {erroLogin && <p className="form-error">{erroLogin}</p>}
            <button className="primary-button" type="submit" disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuAberto ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div className="brand-row">
            <div className="brand-mark-small">
              <Activity size={20} />
            </div>
            <div>
              <strong>ACS Saude</strong>
              <small>Microarea Posto</small>
            </div>
          </div>
          <button className="icon-button mobile-only" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
            <X />
          </button>
        </div>
        <nav>
          {menus.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={tela === item.id ? 'active' : ''}
                onClick={() => navegarPara(item.id)}
              >
                <Icon size={20} />
                {item.label}
              </button>
            )
          })}
          <button onClick={sair}>
            <LogOut size={20} />
            Sair
          </button>
        </nav>
      </aside>
      {menuAberto && <button className="menu-backdrop mobile-only" onClick={() => setMenuAberto(false)} aria-label="Fechar menu" />}

      <main className="content">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Menu />
          </button>
          <div>
            <span>ACS Controle Saude</span>
            <strong>{menus.find((item) => item.id === tela)?.label}</strong>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar" />
          </div>
        </header>

        {tela === 'dashboard' && (
          <section className="screen animate-in">
            <div className="screen-title">
              <div>
                <p className="eyebrow">Painel da ACS</p>
                <h2>Inicio</h2>
              </div>
            </div>
            <div className="quick-filters">
              {['Hoje', 'Semana', 'Mes', 'Pendencias', 'Prioridades'].map((item) => (
                <button key={item} className={filtroRapido === item ? 'selected' : ''} onClick={() => setFiltroRapido(item)}>
                  {item}
                </button>
              ))}
            </div>
            <div className="metric-grid">
              {indicadores.map((card) => {
                const Icon = card.icon
                return (
                  <button key={card.label} className={`metric-card ${card.status}`} onClick={() => navegarPara('indicadores')}>
                    <span>
                      <Icon size={22} />
                    </span>
                    <strong>{card.valor}</strong>
                    <small>{card.label}</small>
                  </button>
                )
              })}
            </div>
            <div className="two-column">
              <ListaFamilias familias={familiasComEndereco.filter(f => f.status !== 'em_dia')} titulo={fraseQuantidade(familiasComEndereco.filter(f => f.status !== 'em_dia').length, 'familia prioritaria', 'familias prioritarias')} />
              <ListaMoradores moradores={resultadosBusca.slice(0, 5)} titulo="Busca rapida" />
            </div>
          </section>
        )}

        {tela === 'logradouros' && (
          <section className="screen two-column animate-in">
            <CrudCard title="Cadastrar logradouro">
              <form className="form-grid" onSubmit={adicionarLogradouro}>
                <label>
                  Area ou bairro
                  <input name="bairro" placeholder="Ex.: Tucano" defaultValue={logradouroEditando?.bairro ?? ''} required />
                </label>
                <label>
                  Nome do logradouro
                  <input name="nome" placeholder="Ex.: Rua 16" defaultValue={logradouroEditando?.nome ?? ''} required />
                </label>
                <label>
                  Tipo
                  <select name="tipo" defaultValue={logradouroEditando?.tipo ?? 'Rua'} aria-label="Tipo de logradouro" key={logradouroEditando?.id ?? 'novo-logradouro'}>
                    <option>Rua</option>
                    <option>Travessa</option>
                    <option>Avenida</option>
                    <option>Ramal</option>
                    <option>Vila</option>
                    <option>Outro</option>
                  </select>
                </label>
                <label>
                  Quantidade de imoveis
                  <input name="quantidadeImoveis" type="number" min="0" placeholder="Ex.: 16" defaultValue={logradouroEditando?.quantidadeImoveis ?? ''} required />
                </label>
                <label>
                  Observacoes do logradouro
                  <textarea name="observacoes" placeholder="Referencia, trecho, ponto conhecido..." defaultValue={logradouroEditando?.observacoes ?? ''} />
                </label>
                <div className="form-actions">
                  <button className="primary-button">{logradouroEditando ? 'Atualizar' : 'Salvar'}</button>
                  {logradouroEditando && (
                    <button className="secondary-button" type="button" onClick={() => setLogradouroEditando(null)}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </CrudCard>
            <CrudCard title="Lista">
              <div className="stack-list">
                {logradouros.map((item) => (
                  <article key={item.id} className="family-card">
                    <div className="family-head">
                      <MapPinned size={18} />
                      <div>
                        <strong>{item.tipo} {item.nome}</strong>
                        <small>{item.bairro} - {item.quantidadeImoveis} imoveis</small>
                      </div>
                      <div className="card-actions">
                        <button className="icon-action" type="button" onClick={() => setLogradouroEditando(item)} aria-label="Editar logradouro">
                          <Edit3 size={17} />
                        </button>
                        <button className="icon-action danger" type="button" onClick={() => excluirLogradouro(item.id)} aria-label="Excluir logradouro">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </CrudCard>
          </section>
        )}

        {tela === 'familias' && (
          <section className="screen two-column animate-in">
            <CrudCard title={familiaEditando ? 'Editar Familia' : 'Nova Familia'}>
              <form className="form-grid" onSubmit={adicionarFamilia} key={familiaEditando?.id ?? 'nova-familia'}>
                <label>
                  Logradouro
                  <select name="logradouroId" defaultValue={familiaEditando?.logradouroId ?? undefined} required>
                    {logradouros.map((item) => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Numero da casa
                  <input name="numero" placeholder="Ex.: 123" defaultValue={familiaEditando?.numero ?? ''} required />
                </label>
                <label>
                  Nome da familia
                  <input name="nome" placeholder="Ex.: Familia Souza" defaultValue={familiaEditando?.nome ?? ''} required />
                </label>
                <label>
                  Tipo do imovel
                  <select name="tipoImovel" defaultValue={familiaEditando?.tipoImovel ?? 'Casa'}>
                    <option>Casa</option>
                    <option>Apartamento</option>
                    <option>Comercio</option>
                    <option>Outro</option>
                  </select>
                </label>
                <label>
                  Responsavel familiar
                  <input name="responsavel" placeholder="Nome do responsavel" defaultValue={familiaEditando?.responsavel ?? ''} required />
                </label>
                <label>
                  Telefone
                  <input name="telefone" placeholder="(00) 00000-0000" defaultValue={familiaEditando?.telefone ?? ''} />
                </label>
                <label>
                  Quantidade de moradores
                  <input name="quantidadeMoradores" type="number" min="0" placeholder="Total de pessoas na casa" defaultValue={familiaEditando?.quantidadeMoradores ?? ''} />
                </label>
                <label>
                  Situacao da moradia
                  <input name="situacaoMoradia" placeholder="Propria, alugada, cedida..." defaultValue={familiaEditando?.situacaoMoradia ?? ''} />
                </label>
                <label>
                  Data da ultima visita
                  <input name="ultimaVisita" type="date" defaultValue={familiaEditando?.ultimaVisita ?? isoHoje} />
                </label>
                <label>
                  Status da visita
                  <select name="status" defaultValue={familiaEditando?.status ?? 'pendente'}>
                    <option value="em_dia">Em dia</option>
                    <option value="pendente">Pendente</option>
                    <option value="atrasada">Atrasada</option>
                  </select>
                </label>
                <label>
                  Observacoes do domicilio
                  <textarea name="observacoes" placeholder="Informacoes importantes sobre a familia ou moradia" defaultValue={familiaEditando?.observacoes ?? ''} />
                </label>
                <div className="form-actions">
                  <button className="primary-button">{familiaEditando ? 'Atualizar' : 'Salvar'}</button>
                  {familiaEditando && (
                    <button className="secondary-button" type="button" onClick={() => setFamiliaEditando(null)}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </CrudCard>
            <ListaFamilias familias={familiasComEndereco} titulo="Cadastradas" onEdit={editarFamilia} onDelete={excluirFamilia} />
          </section>
        )}

        {tela === 'moradores' && (
          <section className="screen two-column animate-in">
            <CrudCard title={moradorEditando ? 'Editar Morador' : 'Novo Morador'}>
              <form className="form-grid" onSubmit={adicionarMorador} key={moradorEditando?.id ?? 'novo-morador'}>
                <label>
                  Nome completo
                  <input name="nome" placeholder="Ex.: Maria Souza" defaultValue={moradorEditando?.nome ?? ''} required />
                </label>
                <label>
                  CPF
                  <input name="cpf" placeholder="000.000.000-00" defaultValue={moradorEditando?.cpf ?? ''} required />
                </label>
                <label>
                  CNS
                  <input name="cns" placeholder="Cartao Nacional de Saude" defaultValue={moradorEditando?.cns ?? ''} />
                </label>
                <label>
                  NIS
                  <input name="nis" placeholder="Numero de Identificacao Social" defaultValue={moradorEditando?.nis ?? ''} />
                </label>
                <label>
                  Data de nascimento
                  <input name="nascimento" type="date" defaultValue={moradorEditando?.nascimento ?? ''} required />
                </label>
                <label>
                  Sexo
                  <select name="sexo" defaultValue={moradorEditando?.sexo ?? 'Feminino'}>
                    <option>Feminino</option>
                    <option>Masculino</option>
                    <option>Outro</option>
                  </select>
                </label>
                <label>
                  Telefone
                  <input name="telefone" placeholder="(00) 00000-0000" defaultValue={moradorEditando?.telefone ?? ''} />
                </label>
                <label>
                  Peso
                  <input name="peso" placeholder="Kg" defaultValue={moradorEditando?.peso ?? ''} />
                </label>
                <label>
                  Altura
                  <input name="altura" placeholder="Metros. Ex.: 1,65" defaultValue={moradorEditando?.altura ?? ''} />
                </label>
                <label>
                  Familia/domicilio vinculado
                  <select name="familiaId" defaultValue={moradorEditando?.familiaId ?? undefined} required>
                    {familias.map((item) => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                  </select>
                </label>
                <CheckGrid
                  items={[
                    ['hipertenso', 'Hipertenso'],
                    ['diabetico', 'Diabetico'],
                    ['gestante', 'Gestante'],
                    ['preNatalEmDia', 'Pre-natal em dia'],
                    ['bolsaFamilia', 'Bolsa Familia'],
                    ['responsavelFamiliar', 'Responsavel familiar'],
                    ['remedioControlado', 'Remedio controlado'],
                    ['vacinaEmDia', 'Vacina em dia'],
                  ]}
                  values={moradorEditando ?? undefined}
                />
                <label>
                  Medicamento controlado
                  <input name="medicamento" placeholder="Nome do medicamento, se houver" defaultValue={moradorEditando?.medicamento ?? ''} />
                </label>
                <label>
                  Observacoes gerais
                  <textarea name="observacoes" placeholder="Informacoes importantes para acompanhamento" defaultValue={moradorEditando?.observacoes ?? ''} />
                </label>
                <div className="form-actions">
                  <button className="primary-button">{moradorEditando ? 'Atualizar' : 'Salvar'}</button>
                  {moradorEditando && (
                    <button className="secondary-button" type="button" onClick={() => setMoradorEditando(null)}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </CrudCard>
            <ListaMoradores moradores={resultadosBusca} titulo="Lista" onEdit={editarMorador} onDelete={excluirMorador} />
          </section>
        )}

        {tela === 'visitas' && (
          <section className="screen two-column animate-in">
            <CrudCard title="Registrar Visita">
              <form className="form-grid" onSubmit={registrarVisita}>
                <label>
                  Familia visitada
                  <select name="familiaId" required>
                    {familias.map((item) => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Data da visita domiciliar
                  <input name="data" type="date" defaultValue={isoHoje} required />
                </label>
                <label>
                  ACS responsavel
                  <input name="acs" placeholder="Nome da ACS" defaultValue="Adriellen Guimaraes" />
                </label>
                <label>
                  Pessoas encontradas
                  <input name="pessoasEncontradas" placeholder="Quem estava na residencia" />
                </label>
                <label>
                  Condicoes acompanhadas
                  <input name="condicoes" placeholder="Hipertensao, gestante, crianca, idoso..." />
                </label>
                <label>
                  Proxima visita recomendada
                  <input name="proximaVisita" type="date" />
                </label>
                <CheckGrid
                  items={[
                    ['vacinaAtualizada', 'Vacina atualizada'],
                    ['preNatalAtualizado', 'Pre-natal atualizado'],
                    ['medicamentoConfirmado', 'Medicamento confirmado'],
                  ]}
                />
                <label>
                  Observacoes da visita
                  <textarea name="observacoes" placeholder="Orientacoes, pendencias e encaminhamentos" />
                </label>
                <label>
                  Status da visita
                  <select name="status" defaultValue="concluida">
                    <option value="concluida">Concluida</option>
                    <option value="pendente">Pendente</option>
                    <option value="retorno_necessario">Retorno necessario</option>
                  </select>
                </label>
                <button className="primary-button">Registrar</button>
              </form>
            </CrudCard>
          </section>
        )}

        {tela === 'indicadores' && (
          <section className="screen animate-in">
            <div className="indicator-tabs">
              {[
                'Bolsa Familia',
                'Hipertensos',
                'Diabeticos',
                'Hipertensos e diabeticos',
                'Idosos acima de 60 anos',
                'Gestantes',
                'Criancas de 0 a 2 anos',
                'Pessoas com remedio controlado',
                'Vacinas pendentes',
                'Pre-natal pendente',
                'Visitas atrasadas',
                'Visitas pendentes',
              ].map((grupo) => (
                <button key={grupo} className={grupoAtivo === grupo ? 'selected' : ''} onClick={() => setGrupoAtivo(grupo)}>
                  {grupo}
                </button>
              ))}
            </div>
            <ListaIndicador moradores={listaGrupo} />
          </section>
        )}

        {tela === 'relatorios' && (
          <section className="screen animate-in">
            <div className="action-row">
              <button className="secondary-button" onClick={exportarPDF}><Download size={17} /> PDF</button>
              <button className="secondary-button" onClick={exportarExcel}><FileSpreadsheet size={17} /> Excel</button>
            </div>
            <ListaIndicador moradores={listaGrupo} />
          </section>
        )}

        {tela === 'configuracoes' && (
          <section className="screen two-column animate-in">
            <CrudCard title="Configuracoes">
              <button className="primary-button">Salvar</button>
            </CrudCard>
          </section>
        )}

        <nav className="mobile-bottom-nav">
          {[
            { id: 'dashboard' as Tela, label: 'Inicio', icon: Activity },
            { id: 'familias' as Tela, label: 'Familias', icon: Home },
            { id: 'visitas' as Tela, label: 'Visitas', icon: CalendarCheck },
            { id: 'indicadores' as Tela, label: 'Alertas', icon: HeartPulse },
            { id: 'moradores' as Tela, label: 'Busca', icon: Search },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button key={item.id} className={tela === item.id ? 'active' : ''} onClick={() => navegarPara(item.id)}>
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </main>
    </div>
  )
}

function CrudCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function CheckGrid({ items, values }: { items: [string, string][]; values?: Record<string, unknown> }) {
  return (
    <div className="check-grid">
      {items.map(([name, label]) => (
        <label key={name} className="check-item">
          <input name={name} type="checkbox" defaultChecked={Boolean(values?.[name])} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )
}

function ListaFamilias({
  familias,
  titulo,
  onEdit,
  onDelete,
}: {
  familias: (Familia & { endereco: string; bairro: string })[]
  titulo: string
  onEdit?: (familia: Familia) => void
  onDelete?: (id: EntityId) => void
}) {
  return (
    <section className="panel">
      <h2>{titulo}</h2>
      <div className="stack-list">
        {familias.length === 0 && <p className="empty-state">Nenhum registro encontrado.</p>}
        {familias.map((familia) => (
          <article key={familia.id} className="family-card">
            <div className="family-head">
              <Home size={18} />
              <div>
                <strong>{familia.nome}</strong>
                <small>{familia.endereco}</small>
              </div>
              {(onEdit || onDelete) && (
                <div className="card-actions">
                  {onEdit && (
                    <button className="icon-action" type="button" onClick={() => onEdit(familia)} aria-label="Editar familia">
                      <Edit3 size={17} />
                    </button>
                  )}
                  {onDelete && (
                    <button className="icon-action danger" type="button" onClick={() => onDelete(familia.id)} aria-label="Excluir familia">
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="family-body">
              <p>{textoUltimaVisita(familia.ultimaVisita)}</p>
              <p className={`deadline-text ${familia.status}`}>{textoPrazoVisita(familia.ultimaVisita)}</p>
              <div className="pill-row">
                <span className={`status-pill ${familia.status}`}>{statusTexto(familia.status)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ListaMoradores({
  moradores,
  titulo,
  onEdit,
  onDelete,
}: {
  moradores: (Morador & { idade: number; crianca: boolean; idoso: boolean; familia: string; endereco: string })[]
  titulo: string
  onEdit?: (morador: Morador) => void
  onDelete?: (id: EntityId) => void
}) {
  return (
    <section className="panel">
      <h2>{titulo}</h2>
      <div className="stack-list">
        {moradores.length === 0 && <p className="empty-state">Nenhum registro encontrado.</p>}
        {moradores.map((morador) => (
          <article key={morador.id} className="family-card">
            <div className="family-head">
              <UserRound size={18} />
              <div>
                <strong>{morador.nome}</strong>
                <small>{morador.idade} anos - {morador.familia}</small>
              </div>
              {(onEdit || onDelete) && (
                <div className="card-actions">
                  {onEdit && (
                    <button className="icon-action" type="button" onClick={() => onEdit(morador)} aria-label="Editar morador">
                      <Edit3 size={17} />
                    </button>
                  )}
                  {onDelete && (
                    <button className="icon-action danger" type="button" onClick={() => onDelete(morador.id)} aria-label="Excluir morador">
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ListaIndicador({
  moradores,
}: {
  moradores: (Morador & { idade: number; familia: string; endereco: string; ultimaVisita: string })[]
}) {
  return (
    <div className="indicator-list">
      {moradores.length === 0 && <p className="empty-state">Nenhum registro encontrado.</p>}
      {moradores.map((morador) => (
        <article key={morador.id} className="indicator-card">
          <div>
            <strong>{morador.nome}</strong>
            <span>CPF: {morador.cpf || 'Nao informado'} - {morador.idade} anos</span>
            <small>{morador.familia} - {morador.endereco}</small>
          </div>
          <div className="indicator-actions">
            <span className="status-pill risco">{pendenciaMorador(morador)}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function textoUltimaVisita(data: string) {
  if (!data) return 'Sem visita registrada'
  return `Ultima visita: ${formatarData(data)} (${diasDesde(data)} dias)`
}

function textoPrazoVisita(data: string) {
  if (!data) return `Primeira visita pendente. Ciclo padrao: ${PRAZO_VISITA_DIAS} dias.`
  const dias = diasDesde(data)
  const proxima = adicionarDias(data, PRAZO_VISITA_DIAS)
  const saldo = PRAZO_VISITA_DIAS - dias
  if (saldo > 0) return `Proxima visita ate ${formatarData(proxima)} (${saldo} dias restantes)`
  if (saldo === 0) return `Visita vence hoje (${formatarData(proxima)})`
  return `Visita atrasada ha ${Math.abs(saldo)} dias. Passar novamente.`
}

function pendenciaMorador(morador: Partial<Morador> & { idoso?: boolean; crianca?: boolean; statusFamilia?: StatusVisita }) {
  const pendencias = []
  if (morador.statusFamilia === 'atrasada') pendencias.push('Visita atrasada')
  if (morador.gestante && !morador.preNatalEmDia) pendencias.push('Pre-natal pendente')
  if (!morador.vacinaEmDia) pendencias.push('Vacina pendente')
  if (morador.hipertenso) pendencias.push('Hipertensao')
  return pendencias.slice(0, 1).join('') || 'Em dia'
}

export default App
