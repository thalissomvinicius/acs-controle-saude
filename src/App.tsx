import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Baby,
  CalendarCheck,
  ClipboardList,
  Download,
  FileSpreadsheet,
  HeartPulse,
  Home,
  LogOut,
  MapPinned,
  Menu,
  Pill,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Syringe,
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

const logradourosIniciais: Logradouro[] = [
  { id: 1, bairro: 'Tucano', nome: 'Nove de Junho', tipo: 'Rua', quantidadeImoveis: 16, observacoes: 'Área central da microárea.' },
  { id: 2, bairro: 'Tucano', nome: 'Travessa 04', tipo: 'Travessa', quantidadeImoveis: 20, observacoes: 'Muitas famílias com idosos.' },
  { id: 3, bairro: 'Posto da Feira', nome: 'do Hospital', tipo: 'Rua', quantidadeImoveis: 8, observacoes: 'Próximo à UBS.' },
]

const familiasIniciais: Familia[] = [
  {
    id: 1,
    logradouroId: 1,
    numero: '01',
    tipoImovel: 'Casa',
    nome: 'Família Silva',
    responsavel: 'Eder Belem da Silva',
    telefone: '(92) 98888-0001',
    quantidadeMoradores: 4,
    situacaoMoradia: 'Própria',
    observacoes: 'Acompanhar hipertensão e vacina infantil.',
    ultimaVisita: '2026-04-14',
    status: 'pendente',
  },
  {
    id: 2,
    logradouroId: 2,
    numero: '04',
    tipoImovel: 'Casa',
    nome: 'Família Dalmasso',
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
    nome: 'Família Freitas',
    responsavel: 'Francisca do Nascimento Freitas',
    telefone: '(92) 98888-0003',
    quantidadeMoradores: 5,
    situacaoMoradia: 'Cedida',
    observacoes: 'Bolsa Família e remédio controlado.',
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
    observacoes: 'Acompanhar pressão arterial.',
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
    observacoes: 'Pré-natal pendente.',
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
    observacoes: 'Prioridade por hipertensão, diabetes e vacina.',
  },
]

const visitasIniciais: Visita[] = [
  {
    id: 1,
    familiaId: 1,
    data: '2026-04-14',
    acs: 'Adriellen Guimaraes',
    pessoasEncontradas: 'Eder e Lia',
    condicoes: 'Hipertensão, criança 0 a 2 anos',
    vacinaAtualizada: false,
    preNatalAtualizado: true,
    medicamentoConfirmado: true,
    observacoes: 'Orientada atualização vacinal.',
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
    observacoes: 'Agendar pré-natal.',
    proximaVisita: '2026-04-03',
    status: 'pendente',
  },
]

const menus = [
  { id: 'dashboard' as Tela, label: 'Dashboard', icon: Activity },
  { id: 'logradouros' as Tela, label: 'Logradouros', icon: MapPinned },
  { id: 'familias' as Tela, label: 'Famílias', icon: Home },
  { id: 'moradores' as Tela, label: 'Moradores', icon: UsersRound },
  { id: 'visitas' as Tela, label: 'Visitas', icon: CalendarCheck },
  { id: 'indicadores' as Tela, label: 'Indicadores', icon: HeartPulse },
  { id: 'relatorios' as Tela, label: 'Relatórios', icon: ClipboardList },
  { id: 'configuracoes' as Tela, label: 'Configurações', icon: Settings },
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

function formatarData(data: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${data}T00:00:00`))
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
    concluida: 'Concluída',
    retorno_necessario: 'Retorno necessário',
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
  const [filtroRapido, setFiltroRapido] = useState('Este mês')
  const [logradouros, setLogradouros] = usePersistentState('acs:logradouros', logradourosIniciais)
  const [familias, setFamilias] = usePersistentState('acs:familias', familiasIniciais)
  const [moradores, setMoradores] = usePersistentState('acs:moradores', moradoresIniciais)
  const [visitas, setVisitas] = usePersistentState('acs:visitas', visitasIniciais)
  const [grupoAtivo, setGrupoAtivo] = useState('Vacinas pendentes')

  const garantirPerfil = useCallback(async (user: SupabaseUser) => {
    if (!supabase || !user.email) return
    const nome = user.email.split('@')[0]
    const { error } = await supabase.from('usuarios').upsert({
      id: user.id,
      nome,
      email: user.email,
      cargo: 'ACS',
      unidade_saude: 'Posto da Feira',
      microarea: 'Microárea principal',
      ativo: true,
    })
    if (error) throw error
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
      { label: 'Total de famílias', valor: familias.length, icon: Home, status: 'neutro' },
      { label: 'Total de moradores', valor: moradores.length, icon: UsersRound, status: 'neutro' },
      { label: 'Visitas no mês', valor: visitasMes, icon: CalendarCheck, status: 'ok' },
      { label: 'Visitas pendentes', valor: familias.filter((item) => item.status === 'pendente').length, icon: ClipboardList, status: 'atencao' },
      { label: 'Visitas atrasadas', valor: familias.filter((item) => item.status === 'atrasada').length, icon: AlertTriangle, status: 'risco' },
      { label: 'Gestantes', valor: moradores.filter((item) => item.gestante).length, icon: HeartPulse, status: 'atencao' },
      { label: 'Crianças 0 a 2', valor: moradoresDetalhados.filter((item) => item.crianca).length, icon: Baby, status: 'atencao' },
      { label: 'Idosos 60+', valor: moradoresDetalhados.filter((item) => item.idoso).length, icon: UserRound, status: 'neutro' },
      { label: 'Hipertensos', valor: moradores.filter((item) => item.hipertenso).length, icon: Activity, status: 'atencao' },
      { label: 'Diabéticos', valor: moradores.filter((item) => item.diabetico).length, icon: HeartPulse, status: 'atencao' },
      { label: 'Hipertensos e diabéticos', valor: moradores.filter((item) => item.hipertenso && item.diabetico).length, icon: ShieldCheck, status: 'risco' },
      { label: 'Bolsa Família', valor: moradores.filter((item) => item.bolsaFamilia).length, icon: UsersRound, status: 'neutro' },
      { label: 'Remédio controlado', valor: moradores.filter((item) => item.remedioControlado).length, icon: Pill, status: 'atencao' },
      { label: 'Vacinas pendentes', valor: moradores.filter((item) => !item.vacinaEmDia).length, icon: Syringe, status: 'risco' },
      { label: 'Pré-natal pendente', valor: moradores.filter((item) => item.gestante && !item.preNatalEmDia).length, icon: Baby, status: 'risco' },
    ]
  }, [familias, moradores, moradoresDetalhados, visitas])

  const resultadosBusca = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    if (!termo) return moradoresDetalhados
    return moradoresDetalhados.filter((morador) =>
      [
        morador.nome,
        morador.cpf,
        morador.cns,
        morador.nis,
        morador.familia,
        morador.endereco,
        morador.hipertenso ? 'hipertenso' : '',
        morador.diabetico ? 'diabetico diabético' : '',
        morador.bolsaFamilia ? 'bolsa familia bolsa família' : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(termo),
    )
  }, [busca, moradoresDetalhados])

  const listaGrupo = useMemo(() => {
    const filtros: Record<string, (item: (typeof moradoresDetalhados)[number]) => boolean> = {
      'Bolsa Família': (item) => item.bolsaFamilia,
      Hipertensos: (item) => item.hipertenso,
      Diabéticos: (item) => item.diabetico,
      'Hipertensos e diabéticos': (item) => item.hipertenso && item.diabetico,
      'Idosos acima de 60 anos': (item) => item.idoso,
      Gestantes: (item) => item.gestante,
      'Crianças de 0 a 2 anos': (item) => item.crianca,
      'Pessoas com remédio controlado': (item) => item.remedioControlado,
      'Vacinas pendentes': (item) => !item.vacinaEmDia,
      'Pré-natal pendente': (item) => item.gestante && !item.preNatalEmDia,
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
        if (!data.user) throw new Error('Login não retornou usuário.')
        await garantirPerfil(data.user)
        setUsuarioId(data.user.id)
        setLogado(true)
        await carregarDados(data.user.id)
      } catch (error) {
        setErroLogin(error instanceof Error ? error.message : 'Não foi possível entrar.')
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

    if (supabase && usuarioId) {
      const { data, error } = await supabase
        .from('logradouros')
        .insert({
          usuario_id: usuarioId,
          bairro: novo.bairro,
          nome: novo.nome,
          tipo: novo.tipo,
          quantidade_imoveis: novo.quantidadeImoveis,
          observacoes: novo.observacoes,
        })
        .select()
        .single()
      if (error) {
        alert(error.message)
        return
      }
      setLogradouros((atuais) => [...atuais, mapLogradouro(data)])
      event.currentTarget.reset()
      return
    }

    setLogradouros((atuais) => [
      ...atuais,
      {
        id: Date.now(),
        ...novo,
      },
    ])
    event.currentTarget.reset()
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
      status: String(dados.get('status')) as StatusVisita,
    }

    if (supabase && usuarioId) {
      const { data, error } = await supabase
        .from('familias')
        .insert({
          usuario_id: usuarioId,
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
        })
        .select()
        .single()
      if (error) {
        alert(error.message)
        return
      }
      setFamilias((atuais) => [...atuais, mapFamilia(data)])
      event.currentTarget.reset()
      return
    }

    setFamilias((atuais) => [
      ...atuais,
      {
        id: Date.now(),
        ...nova,
      },
    ])
    event.currentTarget.reset()
  }

  async function adicionarMorador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dados = new FormData(event.currentTarget)
    const cpf = String(dados.get('cpf'))
    if (moradores.some((item) => item.cpf === cpf)) {
      alert('J? existe um morador cadastrado com este CPF.')
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

    if (supabase && usuarioId) {
      const { data, error } = await supabase
        .from('moradores')
        .insert({
          usuario_id: usuarioId,
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
        })
        .select()
        .single()
      if (error) {
        alert(error.message)
        return
      }
      const moradorSalvo = mapMorador(data)
      if (novo.remedioControlado && novo.medicamento) {
        await supabase.from('medicamentos').insert({
          usuario_id: usuarioId,
          morador_id: moradorSalvo.id,
          nome_medicamento: novo.medicamento,
          uso_continuo: true,
        })
        moradorSalvo.medicamento = novo.medicamento
      }
      setMoradores((atuais) => [...atuais, moradorSalvo])
      event.currentTarget.reset()
      return
    }

    setMoradores((atuais) => [
      ...atuais,
      {
        id: Date.now(),
        ...novo,
      },
    ])
    event.currentTarget.reset()
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
      proximaVisita: String(dados.get('proximaVisita')),
      status: String(dados.get('status')) as StatusRegistro,
    }

    if (supabase && usuarioId) {
      const { error } = await supabase.from('visitas').insert({
        usuario_id: usuarioId,
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
      await carregarDados(usuarioId)
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
        String(familia.id) === familiaId ? { ...familia, ultimaVisita: data, status: dados.get('status') === 'concluida' ? 'em_dia' : 'pendente' } : familia,
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
    doc.text('ACS Controle Saúde - Relatório de indicadores', 14, 16)
    autoTable(doc, {
      head: [['Nome', 'CPF', 'Idade', 'Família', 'Endereço', 'Pendência']],
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
                <th>Família</th>
                <th>Endereço</th>
                <th>Última visita</th>
                <th>Pendência</th>
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
        <section className="login-card">
          <div className="brand-mark">
            <HeartPulse size={34} />
          </div>
          <p className="eyebrow">Conectando ao Supabase</p>
          <h1>ACS Controle Saúde</h1>
          <p className="login-copy">Carregando sessão e dados do sistema...</p>
        </section>
      </main>
    )
  }

  if (!logado) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand-mark">
            <HeartPulse size={34} />
          </div>
          <p className="eyebrow">Sistema da Agente Comunitária de Saúde</p>
          <h1>ACS Controle Saúde</h1>
          <p className="login-copy">Acompanhe famílias, visitas, pendências e indicadores de saúde em campo.</p>
          <form onSubmit={entrar} className="form-grid">
            <label>
              Usuário ou e-mail
              <input name="usuario" autoComplete="username" placeholder="drica@admin.com" type={supabaseConfigurado ? 'email' : 'text'} required />
            </label>
            <label>
              Senha
              <input name="senha" type="password" autoComplete="current-password" placeholder="Digite sua senha" required />
            </label>
            {erroLogin && <p className="form-error">{erroLogin}</p>}
            <button className="primary-button" type="submit" disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <small>
            {supabaseConfigurado
              ? 'Login conectado ao Supabase Auth.'
              : 'Demo local: informe qualquer usuário e senha. No Supabase usaremos autenticação real.'}
          </small>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuAberto ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div className="brand-row">
            <span className="brand-icon">
              <HeartPulse size={24} />
            </span>
            <div>
              <strong>ACS Controle Saúde</strong>
              <small>Microárea Posto da Feira</small>
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
                onClick={() => {
                  setTela(item.id)
                  setMenuAberto(false)
                }}
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

      <main className="content">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Menu />
          </button>
          <div>
            <span>ACS Controle Saúde</span>
            <strong>{menus.find((item) => item.id === tela)?.label}</strong>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar nome, CPF, rua, família..." />
          </div>
        </header>

        {tela === 'dashboard' && (
          <section className="screen">
            <div className="screen-title">
              <div>
                <p className="eyebrow">Painel de acompanhamento</p>
                <h2>Prioridades da microárea</h2>
              </div>
              <button className="primary-button compact">
                <Plus size={18} />
                Nova visita
              </button>
            </div>
            <div className="quick-filters">
              {['Hoje', 'Esta semana', 'Este mês', 'Pendências', 'Prioridades'].map((item) => (
                <button key={item} className={filtroRapido === item ? 'selected' : ''} onClick={() => setFiltroRapido(item)}>
                  {item}
                </button>
              ))}
            </div>
            <div className="priority-strip">
              <div>
                <span>Hoje</span>
                <strong>
                  {fraseQuantidade(familias.filter((item) => item.status !== 'em_dia').length, 'família precisa', 'famílias precisam')} de atenção
                </strong>
              </div>
              <div>
                <span>Maior risco</span>
                <strong>{fraseQuantidade(indicadores.find((item) => item.label === 'Vacinas pendentes')?.valor ?? 0, 'vacina pendente', 'vacinas pendentes')}</strong>
              </div>
              <div>
                <span>Roteiro</span>
                <strong>{fraseQuantidade(familias.filter((item) => item.status === 'atrasada').length, 'visita atrasada', 'visitas atrasadas')}</strong>
              </div>
            </div>
            <div className="metric-grid">
              {indicadores.map((card) => {
                const Icon = card.icon
                return (
                  <button key={card.label} className={`metric-card ${card.status}`} onClick={() => setTela('indicadores')}>
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
              <ListaFamilias familias={familiasComEndereco} titulo="Famílias para acompanhar" />
              <ListaMoradores moradores={resultadosBusca.slice(0, 5)} titulo="Busca rápida e grupos" />
            </div>
          </section>
        )}

        {tela === 'logradouros' && (
          <section className="screen two-column">
            <CrudCard title="Cadastrar logradouro">
              <form className="form-grid" onSubmit={adicionarLogradouro}>
                <input name="bairro" placeholder="Bairro ou área" required />
                <input name="nome" placeholder="Nome do logradouro" required />
                <select name="tipo" defaultValue="Rua">
                  <option>Rua</option>
                  <option>Travessa</option>
                  <option>Avenida</option>
                  <option>Ramal</option>
                  <option>Vila</option>
                  <option>Outro</option>
                </select>
                <input name="quantidadeImoveis" type="number" min="0" placeholder="Quantidade de imóveis" required />
                <textarea name="observacoes" placeholder="Observações" />
                <button className="primary-button">Salvar logradouro</button>
              </form>
            </CrudCard>
            <CrudCard title="Lista de logradouros">
              <div className="stack-list">
                {logradouros.map((item) => (
                  <article key={item.id} className="list-card">
                    <MapPinned />
                    <div>
                      <strong>{item.bairro}</strong>
                      <span>
                        {item.tipo} {item.nome} · {item.quantidadeImoveis} imóveis
                      </span>
                      <small>{item.observacoes}</small>
                    </div>
                  </article>
                ))}
              </div>
            </CrudCard>
          </section>
        )}

        {tela === 'familias' && (
          <section className="screen two-column">
            <CrudCard title="Cadastrar domicílio/família">
              <form className="form-grid" onSubmit={adicionarFamilia}>
                <select name="logradouroId" required>
                  {logradouros.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.tipo} {item.nome}
                    </option>
                  ))}
                </select>
                <input name="numero" placeholder="Número da casa" required />
                <select name="tipoImovel" defaultValue="Casa">
                  <option>Casa</option>
                  <option>Apartamento</option>
                  <option>Comércio</option>
                  <option>Outro</option>
                </select>
                <input name="nome" placeholder="Nome da família" required />
                <input name="responsavel" placeholder="Responsável familiar" required />
                <input name="telefone" placeholder="Telefone" />
                <input name="quantidadeMoradores" type="number" min="1" placeholder="Quantidade de moradores" />
                <input name="situacaoMoradia" placeholder="Situação da moradia" />
                <input name="ultimaVisita" type="date" defaultValue={isoHoje} />
                <select name="status" defaultValue="pendente">
                  <option value="em_dia">Em dia</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasada">Atrasada</option>
                </select>
                <textarea name="observacoes" placeholder="Observações" />
                <button className="primary-button">Salvar família</button>
              </form>
            </CrudCard>
            <ListaFamilias familias={familiasComEndereco} titulo="Famílias cadastradas" />
          </section>
        )}

        {tela === 'moradores' && (
          <section className="screen two-column">
            <CrudCard title="Cadastrar morador">
              <form className="form-grid" onSubmit={adicionarMorador}>
                <input name="nome" placeholder="Nome completo" required />
                <input name="cpf" placeholder="CPF" required />
                <input name="cns" placeholder="CNS, se tiver" />
                <input name="nis" placeholder="NIS" />
                <input name="nascimento" type="date" required />
                <select name="sexo" defaultValue="Feminino">
                  <option>Feminino</option>
                  <option>Masculino</option>
                  <option>Outro</option>
                </select>
                <input name="telefone" placeholder="Telefone" />
                <input name="peso" placeholder="Peso" />
                <input name="altura" placeholder="Altura" />
                <select name="familiaId" required>
                  {familias.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
                <CheckGrid
                  items={[
                    ['responsavelFamiliar', 'Responsável familiar'],
                    ['bolsaFamilia', 'Bolsa Família'],
                    ['gestante', 'Gestante'],
                    ['preNatalEmDia', 'Pré-natal em dia'],
                    ['hipertenso', 'Hipertenso'],
                    ['diabetico', 'Diabético'],
                    ['remedioControlado', 'Remédio controlado'],
                    ['vacinaEmDia', 'Vacina em dia'],
                  ]}
                />
                <input name="medicamento" placeholder="Nome do medicamento" />
                <textarea name="observacoes" placeholder="Observações gerais" />
                <button className="primary-button">Salvar morador</button>
              </form>
            </CrudCard>
            <ListaMoradores moradores={resultadosBusca} titulo="Moradores cadastrados" />
          </section>
        )}

        {tela === 'visitas' && (
          <section className="screen two-column">
            <CrudCard title="Registrar visita domiciliar">
              <form className="form-grid" onSubmit={registrarVisita}>
                <select name="familiaId" required>
                  {familias.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
                <input name="data" type="date" defaultValue={isoHoje} required />
                <input name="acs" placeholder="ACS responsável" defaultValue="Adriellen Guimaraes" />
                <input name="pessoasEncontradas" placeholder="Pessoas encontradas" />
                <input name="condicoes" placeholder="Condições acompanhadas" />
                <CheckGrid
                  items={[
                    ['vacinaAtualizada', 'Vacina atualizada'],
                    ['preNatalAtualizado', 'Pré-natal atualizado'],
                    ['medicamentoConfirmado', 'Medicamento confirmado'],
                  ]}
                />
                <textarea name="observacoes" placeholder="Observações da visita" />
                <input name="proximaVisita" type="date" />
                <select name="status" defaultValue="concluida">
                  <option value="concluida">Concluída</option>
                  <option value="pendente">Pendente</option>
                  <option value="retorno_necessario">Retorno necessário</option>
                </select>
                <button className="primary-button">Registrar visita</button>
              </form>
            </CrudCard>
            <CrudCard title="Histórico de visitas">
              <div className="stack-list">
                {visitas.map((visita) => {
                  const familia = familias.find((item) => item.id === visita.familiaId)
                  return (
                    <article key={visita.id} className="list-card">
                      <CalendarCheck />
                      <div>
                        <strong>{familia?.nome}</strong>
                        <span>
                          {formatarData(visita.data)} · {statusTexto(visita.status)}
                        </span>
                        <small>{visita.observacoes}</small>
                      </div>
                    </article>
                  )
                })}
              </div>
            </CrudCard>
          </section>
        )}

        {tela === 'indicadores' && (
          <section className="screen">
            <div className="screen-title">
              <div>
                <p className="eyebrow">Grupos e pendências</p>
                <h2>{grupoAtivo}</h2>
              </div>
              <div className="action-row">
                <button className="secondary-button" onClick={exportarPDF}>
                  <Download size={17} />
                  PDF
                </button>
                <button className="secondary-button" onClick={exportarExcel}>
                  <FileSpreadsheet size={17} />
                  Excel
                </button>
              </div>
            </div>
            <div className="indicator-tabs">
              {[
                'Bolsa Família',
                'Hipertensos',
                'Diabéticos',
                'Hipertensos e diabéticos',
                'Idosos acima de 60 anos',
                'Gestantes',
                'Crianças de 0 a 2 anos',
                'Pessoas com remédio controlado',
                'Vacinas pendentes',
                'Pré-natal pendente',
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
          <section className="screen">
            <div className="screen-title">
              <div>
                <p className="eyebrow">Relatórios</p>
                <h2>Filtros e exportações</h2>
              </div>
              <div className="action-row">
                <button className="secondary-button" onClick={exportarPDF}>
                  <Download size={17} />
                  PDF
                </button>
                <button className="secondary-button" onClick={exportarExcel}>
                  <FileSpreadsheet size={17} />
                  Excel
                </button>
              </div>
            </div>
            <div className="report-filters">
              <input type="date" defaultValue={isoHoje} />
              <select>
                <option>Todos os bairros</option>
                {[...new Set(logradouros.map((item) => item.bairro))].map((bairro) => (
                  <option key={bairro}>{bairro}</option>
                ))}
              </select>
              <select value={grupoAtivo} onChange={(event) => setGrupoAtivo(event.target.value)}>
                <option>Vacinas pendentes</option>
                <option>Pré-natal pendente</option>
                <option>Hipertensos</option>
                <option>Diabéticos</option>
                <option>Bolsa Família</option>
              </select>
            </div>
            <ListaIndicador moradores={listaGrupo} />
          </section>
        )}

        {tela === 'configuracoes' && (
          <section className="screen two-column">
            <CrudCard title="Configurações">
              <div className="settings-list">
                <label>
                  Dias para visita ficar atrasada
                  <input type="number" defaultValue={30} />
                </label>
                <label>
                  Nome da unidade de saúde
                  <input defaultValue="Posto da Feira" />
                </label>
                <button className="primary-button">Salvar configurações</button>
              </div>
            </CrudCard>
            <CrudCard title="Backup e segurança">
              <p className="muted">
                No Supabase, as senhas ficam protegidas pelo Supabase Auth. O backup pode ser feito pelo painel do banco ou por exportação dos relatórios.
              </p>
              <button className="secondary-button">Gerar backup local</button>
            </CrudCard>
          </section>
        )}
        <nav className="mobile-bottom-nav" aria-label="Navegação principal">
          {[
            { id: 'dashboard' as Tela, label: 'Início', icon: Activity },
            { id: 'familias' as Tela, label: 'Famílias', icon: Home },
            { id: 'visitas' as Tela, label: 'Visitas', icon: CalendarCheck },
            { id: 'indicadores' as Tela, label: 'Indicadores', icon: HeartPulse },
            { id: 'moradores' as Tela, label: 'Busca', icon: Search },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button key={item.id} className={tela === item.id ? 'active' : ''} onClick={() => setTela(item.id)}>
                <Icon size={19} />
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

function CheckGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="check-grid">
      {items.map(([name, label]) => (
        <label key={name} className="check-item">
          <input name={name} type="checkbox" />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )
}

function ListaFamilias({ familias, titulo }: { familias: (Familia & { endereco: string; bairro: string })[]; titulo: string }) {
  return (
    <section className="panel">
      <h2>{titulo}</h2>
      <div className="stack-list">
        {familias.map((familia) => (
          <article key={familia.id} className="family-card">
            <div className="family-head">
              <Home />
              <div>
                <strong>
                  Nº {familia.numero} · {familia.tipoImovel}
                </strong>
                <span>{familia.endereco}</span>
              </div>
            </div>
            <div className="family-body">
              <h3>{familia.nome}</h3>
              <p>{familia.responsavel}</p>
              <div className="pill-row">
                <span className={`status-pill ${familia.status}`}>{statusTexto(familia.status)}</span>
                <span className="status-pill neutro">Visitado há {diasDesde(familia.ultimaVisita)} dias</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ListaMoradores({ moradores, titulo }: { moradores: (Morador & { idade: number; crianca: boolean; idoso: boolean; familia: string; endereco: string })[]; titulo: string }) {
  return (
    <section className="panel">
      <h2>{titulo}</h2>
      <div className="stack-list">
        {moradores.map((morador) => (
          <article key={morador.id} className="list-card">
            <UserRound />
            <div>
              <strong>{morador.nome}</strong>
              <span>
                {morador.idade} anos · {morador.familia}
              </span>
              <small>{pendenciaMorador(morador)}</small>
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
      {moradores.map((morador) => (
        <article key={morador.id} className="indicator-card">
          <div>
            <strong>{morador.nome}</strong>
            <span>
              CPF {morador.cpf} · {morador.idade} anos
            </span>
            <small>
              {morador.familia} · {morador.endereco}
            </small>
            <small>Última visita: {morador.ultimaVisita ? formatarData(morador.ultimaVisita) : 'sem registro'}</small>
          </div>
          <div className="indicator-actions">
            <span className="status-pill risco">{pendenciaMorador(morador)}</span>
            <button className="secondary-button">Abrir</button>
            <button className="primary-button compact">Registrar visita</button>
          </div>
        </article>
      ))}
    </div>
  )
}

function pendenciaMorador(morador: Partial<Morador> & { idoso?: boolean; crianca?: boolean; statusFamilia?: StatusVisita }) {
  const pendencias = []
  if (morador.statusFamilia === 'atrasada') pendencias.push('Visita atrasada')
  if (morador.statusFamilia === 'pendente') pendencias.push('Visita pendente')
  if (morador.gestante && !morador.preNatalEmDia) pendencias.push('Pré-natal pendente')
  if (!morador.vacinaEmDia) pendencias.push('Vacina pendente')
  if (morador.hipertenso && morador.diabetico) pendencias.push('Hipertensão e diabetes')
  else if (morador.hipertenso) pendencias.push('Hipertensão')
  else if (morador.diabetico) pendencias.push('Diabetes')
  if (morador.remedioControlado) pendencias.push('Remédio controlado')
  if (morador.bolsaFamilia) pendencias.push('Bolsa Família')
  if (morador.idoso) pendencias.push('Idoso')
  if (morador.crianca) pendencias.push('Criança 0 a 2')
  return pendencias.slice(0, 3).join(', ') || 'Sem pendência'
}

export default App
