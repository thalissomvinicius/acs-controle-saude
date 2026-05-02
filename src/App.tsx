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
type StatusVacina = 'aplicada' | 'pendente' | 'atrasada'
type Tela =
  | 'dashboard'
  | 'logradouros'
  | 'familias'
  | 'moradores'
  | 'visitas'
  | 'vacinas'
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

type VacinaRegistro = {
  id: EntityId
  moradorId: EntityId
  nome: string
  dose: string
  dataAplicacao: string
  dataPrevista: string
  status: StatusVacina
  observacoes: string
}

type ConfiguracoesApp = {
  unidadeSaude: string
  microarea: string
  diasParaVisitaAtrasada: number
  backupAutomatico: boolean
}

const hoje = new Date()
const isoHoje = hoje.toISOString().slice(0, 10)
const PRAZO_VISITA_DIAS = 30
const configuracoesIniciais: ConfiguracoesApp = {
  unidadeSaude: 'Posto da Feira',
  microarea: 'Microarea principal',
  diasParaVisitaAtrasada: PRAZO_VISITA_DIAS,
  backupAutomatico: false,
}
const loginDemoPermitido = !import.meta.env.PROD && !supabaseConfigurado

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

const vacinasIniciais: VacinaRegistro[] = [
  {
    id: 1,
    moradorId: 2,
    nome: 'Pentavalente',
    dose: '2a dose',
    dataAplicacao: '',
    dataPrevista: '2025-05-15',
    status: 'atrasada',
    observacoes: 'Conferir caderneta e orientar UBS.',
  },
  {
    id: 2,
    moradorId: 4,
    nome: 'Influenza',
    dose: 'Anual 2026',
    dataAplicacao: '',
    dataPrevista: '2026-04-01',
    status: 'pendente',
    observacoes: 'Prioridade por idade e condicoes cronicas.',
  },
]

const vacinasCatalogo = [
  'BCG',
  'Hepatite B',
  'Pentavalente',
  'VIP',
  'Rotavirus',
  'Pneumococica',
  'Meningococica C',
  'Febre amarela',
  'Triplice viral',
  'DTP',
  'Influenza',
  'COVID-19',
  'dT',
  'dTpa',
]

const menus = [
  { id: 'dashboard' as Tela, label: 'Inicio', icon: Activity },
  { id: 'logradouros' as Tela, label: 'Logradouros', icon: MapPinned },
  { id: 'familias' as Tela, label: 'Familias', icon: Home },
  { id: 'moradores' as Tela, label: 'Moradores', icon: UsersRound },
  { id: 'visitas' as Tela, label: 'Visitas', icon: CalendarCheck },
  { id: 'vacinas' as Tela, label: 'Vacinas', icon: Syringe },
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

function statusVisitaAutomatico(dataUltimaVisita: string, statusAtual: StatusVisita = 'pendente', prazoDias = PRAZO_VISITA_DIAS): StatusVisita {
  if (!dataUltimaVisita) return statusAtual
  const dias = diasDesde(dataUltimaVisita)
  if (dias > prazoDias) return 'atrasada'
  if (dias >= prazoDias - 7) return 'pendente'
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

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, '')
}

function normalizarNumeroDecimal(valor: string) {
  const limpo = valor.trim().replace(',', '.')
  if (!limpo) return ''
  const numero = Number(limpo)
  return Number.isFinite(numero) ? String(numero) : ''
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

function mapVacina(row: Record<string, unknown>): VacinaRegistro {
  return {
    id: String(row.id),
    moradorId: String(row.morador_id),
    nome: String(row.nome_vacina ?? ''),
    dose: String(row.dose ?? ''),
    dataAplicacao: String(row.data_aplicacao ?? ''),
    dataPrevista: String(row.data_prevista ?? ''),
    status: String(row.status_vacina ?? 'pendente') as StatusVacina,
    observacoes: String(row.observacoes ?? ''),
  }
}

function mapConfiguracoes(row: Record<string, unknown>): ConfiguracoesApp {
  return {
    unidadeSaude: String(row.unidade_saude ?? configuracoesIniciais.unidadeSaude),
    microarea: String(row.microarea ?? configuracoesIniciais.microarea),
    diasParaVisitaAtrasada: Number(row.dias_para_visita_atrasada ?? configuracoesIniciais.diasParaVisitaAtrasada),
    backupAutomatico: Boolean(row.backup_automatico),
  }
}

function statusTexto(status: StatusVisita | StatusRegistro | StatusVacina) {
  const mapa = {
    em_dia: 'Em dia',
    pendente: 'Pendente',
    atrasada: 'Atrasada',
    concluida: 'Concluida',
    retorno_necessario: 'Retorno necessario',
    aplicada: 'Aplicada',
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
  const [vacinas, setVacinas] = usePersistentState('acs:vacinas', vacinasIniciais)
  const [configuracoes, setConfiguracoes] = usePersistentState('acs:configuracoes', configuracoesIniciais)
  const [configuracoesSalvas, setConfiguracoesSalvas] = useState('')
  const [grupoAtivo, setGrupoAtivo] = useState('Vacinas pendentes')
  const [logradouroEditando, setLogradouroEditando] = useState<Logradouro | null>(null)
  const [familiaEditando, setFamiliaEditando] = useState<Familia | null>(null)
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null)
  const [visitaEditando, setVisitaEditando] = useState<Visita | null>(null)
  const [moradorVacinaId, setMoradorVacinaId] = useState<EntityId | ''>('')

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
    setMoradorVacinaId(morador.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editarVisita(visita: Visita) {
    setVisitaEditando(visita)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function statusFamiliaPelaUltimaVisita(visitasDaFamilia: Visita[]): Pick<Familia, 'ultimaVisita' | 'status'> {
    const ultima = [...visitasDaFamilia].sort((a, b) => b.data.localeCompare(a.data))[0]
    if (!ultima) return { ultimaVisita: '', status: 'pendente' }
    return {
      ultimaVisita: ultima.data,
      status: statusFamiliaAposRegistro(ultima.status),
    }
  }

  function recalcularFamiliasLocais(proximasVisitas: Visita[], familiaIds: EntityId[]) {
    setFamilias((atuais) =>
      atuais.map((familia) => {
        if (!familiaIds.some((id) => String(id) === String(familia.id))) return familia
        return {
          ...familia,
          ...statusFamiliaPelaUltimaVisita(proximasVisitas.filter((visita) => String(visita.familiaId) === String(familia.id))),
        }
      }),
    )
  }

  async function sincronizarFamiliaComUltimaVisita(familiaId: EntityId, usuarioAtual: string) {
    if (!supabase) return
    const { data, error } = await supabase
      .from('visitas')
      .select('data_visita,status_visita')
      .eq('usuario_id', usuarioAtual)
      .eq('familia_id', familiaId)
      .order('data_visita', { ascending: false })
      .limit(1)
    if (error) throw error

    const ultima = data?.[0]
    const { error: updateError } = await supabase
      .from('familias')
      .update({
        data_ultima_visita: ultima ? String(ultima.data_visita) : null,
        status_visita: ultima ? statusFamiliaAposRegistro(String(ultima.status_visita) as StatusRegistro) : 'pendente',
      })
      .eq('id', familiaId)
      .eq('usuario_id', usuarioAtual)
    if (updateError) throw updateError
  }

  const garantirPerfil = useCallback(async (user: SupabaseUser) => {
    if (!supabase || !user.email) return
    const nome = user.email.split('@')[0]
    const perfil = {
      id: user.id,
      nome,
      email: user.email,
      cargo: 'ACS',
      unidade_saude: configuracoes.unidadeSaude,
      microarea: configuracoes.microarea,
      ativo: true,
    }

    const { error } = await supabase.from('usuarios').upsert(perfil, { onConflict: 'id' })
    if (error) console.warn('Nao foi possivel sincronizar perfil do usuario:', error.message)
  }, [configuracoes.microarea, configuracoes.unidadeSaude])

  const carregarDados = useCallback(async (userIdAtual: string) => {
    if (!supabase) return
    const [logradourosDb, familiasDb, moradoresDb, visitasDb, medicamentosDb, configuracoesDb] = await Promise.all([
      supabase.from('logradouros').select('*').eq('usuario_id', userIdAtual).order('criado_em', { ascending: true }),
      supabase.from('familias').select('*').eq('usuario_id', userIdAtual).order('criado_em', { ascending: true }),
      supabase.from('moradores').select('*').eq('usuario_id', userIdAtual).order('criado_em', { ascending: true }),
      supabase.from('visitas').select('*').eq('usuario_id', userIdAtual).order('data_visita', { ascending: false }),
      supabase.from('medicamentos').select('*').eq('usuario_id', userIdAtual).order('criado_em', { ascending: true }),
      supabase.from('configuracoes').select('*').eq('usuario_id', userIdAtual).maybeSingle(),
    ])

    const erro = logradourosDb.error || familiasDb.error || moradoresDb.error || visitasDb.error || medicamentosDb.error || configuracoesDb.error
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
    if (configuracoesDb.data) {
      setConfiguracoes(mapConfiguracoes(configuracoesDb.data))
    }

    const vacinasDb = await supabase
      .from('vacinas_moradores')
      .select('*')
      .eq('usuario_id', userIdAtual)
      .order('data_prevista', { ascending: true })

    if (vacinasDb.error) {
      console.warn('Tabela de vacinas ainda nao disponivel no Supabase:', vacinasDb.error.message)
    } else {
      setVacinas((vacinasDb.data ?? []).map(mapVacina))
    }
  }, [setConfiguracoes, setFamilias, setLogradouros, setMoradores, setVacinas, setVisitas])

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
          status: statusVisitaAutomatico(familia.ultimaVisita, familia.status, configuracoes.diasParaVisitaAtrasada),
          endereco: `${logradouro?.tipo ?? 'Rua'} ${logradouro?.nome ?? ''}, ${familia.numero}`,
          bairro: logradouro?.bairro ?? '',
        }
      }),
    [configuracoes.diasParaVisitaAtrasada, familias, logradouros],
  )

  const moradoresDetalhados = useMemo(
    () =>
      moradores.map((morador) => {
        const familia = familiasComEndereco.find((item) => String(item.id) === String(morador.familiaId))
        const idade = calcularIdade(morador.nascimento)
        const vacinasDoMorador = vacinas.filter((vacina) => String(vacina.moradorId) === String(morador.id))
        const vacinasPendentes = pendenciasVacinais(morador, vacinasDoMorador)
        return {
          ...morador,
          idade,
          crianca: idade >= 0 && idade <= 2,
          idoso: idade >= 60,
          vacinaPendente: !morador.vacinaEmDia || vacinasPendentes.length > 0,
          totalVacinasPendentes: vacinasPendentes.length,
          familia: familia?.nome ?? '',
          endereco: familia?.endereco ?? '',
          ultimaVisita: familia?.ultimaVisita ?? '',
          statusFamilia: familia?.status ?? 'pendente',
        }
      }),
    [moradores, familiasComEndereco, vacinas],
  )

  const moradorVacinaSelecionadoId = moradores.some((morador) => String(morador.id) === String(moradorVacinaId))
    ? moradorVacinaId
    : moradores[0]?.id ?? ''

  const visitasDetalhadas = useMemo(
    () =>
      visitas
        .map((visita) => {
          const familia = familiasComEndereco.find((item) => String(item.id) === String(visita.familiaId))
          return {
            ...visita,
            familia: familia?.nome ?? 'Familia nao encontrada',
            endereco: familia?.endereco ?? '',
          }
        })
        .sort((a, b) => b.data.localeCompare(a.data)),
    [visitas, familiasComEndereco],
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
      { label: 'Vacinas pendentes', valor: moradoresDetalhados.filter((item) => item.vacinaPendente).length, icon: Syringe, status: 'risco' },
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
      'Vacinas pendentes': (item) => item.vacinaPendente,
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

    if (!loginDemoPermitido) {
      setErroLogin('Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para liberar o acesso.')
      return
    }

    setLogado(true)
  }

  async function adicionarLogradouro(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const dados = new FormData(form)
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
      form.reset()
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
    form.reset()
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
    const form = event.currentTarget
    const dados = new FormData(form)
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
      form.reset()
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
    form.reset()
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
    const form = event.currentTarget
    const dados = new FormData(form)
    const cpf = apenasDigitos(String(dados.get('cpf')))
    const cns = apenasDigitos(String(dados.get('cns')))
    const nis = apenasDigitos(String(dados.get('nis')))
    const peso = normalizarNumeroDecimal(String(dados.get('peso')))
    const altura = normalizarNumeroDecimal(String(dados.get('altura')))

    if (cpf.length !== 11) {
      alert('Informe um CPF com 11 digitos.')
      return
    }

    if (cns && cns.length !== 15) {
      alert('Informe um CNS com 15 digitos ou deixe em branco.')
      return
    }

    if (nis && nis.length !== 11) {
      alert('Informe um NIS com 11 digitos ou deixe em branco.')
      return
    }

    if (String(dados.get('peso')).trim() && !peso) {
      alert('Informe um peso valido. Exemplo: 72,5')
      return
    }

    if (String(dados.get('altura')).trim() && !altura) {
      alert('Informe uma altura valida. Exemplo: 1,65')
      return
    }

    if (moradores.some((item) => apenasDigitos(item.cpf) === cpf && String(item.id) !== String(moradorEditando?.id))) {
      alert('Ja existe um morador cadastrado com este CPF.')
      return
    }
    const novo = {
      familiaId: String(dados.get('familiaId')),
      nome: String(dados.get('nome')),
      cpf,
      cns,
      nis,
      nascimento: String(dados.get('nascimento')),
      sexo: String(dados.get('sexo')),
      telefone: String(dados.get('telefone')),
      peso,
      altura,
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
      form.reset()
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
    form.reset()
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
    setVacinas((atuais) => atuais.filter((item) => String(item.moradorId) !== String(id)))
    if (moradorEditando && String(moradorEditando.id) === String(id)) setMoradorEditando(null)
    if (String(moradorVacinaId) === String(id)) setMoradorVacinaId('')
  }

  async function salvarVacinaMorador(registro: Omit<VacinaRegistro, 'id'>, id?: EntityId) {
    if (supabase) {
      const usuarioAtual = await obterUsuarioAutenticado()
      const payload = {
        usuario_id: usuarioAtual,
        morador_id: registro.moradorId,
        nome_vacina: registro.nome,
        dose: registro.dose,
        data_aplicacao: registro.dataAplicacao || null,
        data_prevista: registro.dataPrevista || null,
        status_vacina: registro.status,
        observacoes: registro.observacoes,
      }
      const query = id
        ? supabase.from('vacinas_moradores').update(payload).eq('id', id).select().single()
        : supabase.from('vacinas_moradores').insert(payload).select().single()
      const { data, error } = await query
      if (error) {
        alert(`Nao foi possivel salvar a vacina. Rode o SQL da tabela vacinas_moradores no Supabase. Detalhe: ${error.message}`)
        return
      }
      const vacinaSalva = mapVacina(data)
      setVacinas((atuais) => id ? atuais.map((item) => String(item.id) === String(id) ? vacinaSalva : item) : [...atuais, vacinaSalva])
      return
    }

    const vacinaSalva = { id: id ?? Date.now(), ...registro }
    setVacinas((atuais) => id ? atuais.map((item) => String(item.id) === String(id) ? vacinaSalva : item) : [...atuais, vacinaSalva])
  }

  async function excluirVacinaMorador(id: EntityId) {
    const confirmar = window.confirm('Excluir este registro de vacina?')
    if (!confirmar) return

    if (supabase) {
      await obterUsuarioAutenticado()
      const { error } = await supabase.from('vacinas_moradores').delete().eq('id', id)
      if (error) {
        alert(error.message)
        return
      }
    }

    setVacinas((atuais) => atuais.filter((item) => String(item.id) !== String(id)))
  }

  async function registrarVisita(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const dados = new FormData(form)
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
      proximaVisita: String(dados.get('proximaVisita') || adicionarDias(data, configuracoes.diasParaVisitaAtrasada)),
      status: String(dados.get('status')) as StatusRegistro,
    }

    if (supabase) {
      const usuarioAtual = await obterUsuarioAutenticado()
      const payload = {
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
      }
      const query = visitaEditando
        ? supabase.from('visitas').update(payload).eq('id', visitaEditando.id).select().single()
        : supabase.from('visitas').insert(payload).select().single()
      const { error } = await query
      if (error) {
        alert(error.message)
        return
      }
      try {
        await sincronizarFamiliaComUltimaVisita(nova.familiaId, usuarioAtual)
        if (visitaEditando && String(visitaEditando.familiaId) !== String(nova.familiaId)) {
          await sincronizarFamiliaComUltimaVisita(visitaEditando.familiaId, usuarioAtual)
        }
      } catch (errorSincronizacao) {
        alert(errorSincronizacao instanceof Error ? errorSincronizacao.message : 'Erro ao atualizar familia da visita.')
        return
      }
      await carregarDados(usuarioAtual)
      setVisitaEditando(null)
      form.reset()
      return
    }

    const visitaSalva = visitaEditando ? { ...visitaEditando, ...nova } : { id: Date.now(), ...nova }
    const proximasVisitas = visitaEditando
      ? visitas.map((visita) => String(visita.id) === String(visitaEditando.id) ? visitaSalva : visita)
      : [...visitas, visitaSalva]
    setVisitas(proximasVisitas)
    recalcularFamiliasLocais(proximasVisitas, visitaEditando ? [visitaEditando.familiaId, familiaId] : [familiaId])
    setVisitaEditando(null)
    form.reset()
  }

  async function excluirVisita(visita: Visita) {
    const confirmar = window.confirm('Excluir esta visita do historico?')
    if (!confirmar) return

    if (supabase) {
      const usuarioAtual = await obterUsuarioAutenticado()
      const { error } = await supabase.from('visitas').delete().eq('id', visita.id)
      if (error) {
        alert(error.message)
        return
      }
      try {
        await sincronizarFamiliaComUltimaVisita(visita.familiaId, usuarioAtual)
      } catch (errorSincronizacao) {
        alert(errorSincronizacao instanceof Error ? errorSincronizacao.message : 'Erro ao atualizar familia da visita.')
        return
      }
      await carregarDados(usuarioAtual)
    } else {
      const proximasVisitas = visitas.filter((item) => String(item.id) !== String(visita.id))
      setVisitas(proximasVisitas)
      recalcularFamiliasLocais(proximasVisitas, [visita.familiaId])
    }

    if (visitaEditando && String(visitaEditando.id) === String(visita.id)) setVisitaEditando(null)
  }

  async function salvarConfiguracoes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const dados = new FormData(form)
    const proximasConfiguracoes: ConfiguracoesApp = {
      unidadeSaude: String(dados.get('unidadeSaude')).trim() || configuracoesIniciais.unidadeSaude,
      microarea: String(dados.get('microarea')).trim() || configuracoesIniciais.microarea,
      diasParaVisitaAtrasada: Math.max(1, Number(dados.get('diasParaVisitaAtrasada')) || PRAZO_VISITA_DIAS),
      backupAutomatico: dados.get('backupAutomatico') === 'on',
    }

    if (supabase) {
      const usuarioAtual = await obterUsuarioAutenticado()
      const { error } = await supabase.from('configuracoes').upsert(
        {
          usuario_id: usuarioAtual,
          unidade_saude: proximasConfiguracoes.unidadeSaude,
          microarea: proximasConfiguracoes.microarea,
          dias_para_visita_atrasada: proximasConfiguracoes.diasParaVisitaAtrasada,
          backup_automatico: proximasConfiguracoes.backupAutomatico,
        },
        { onConflict: 'usuario_id' },
      )
      if (error) {
        alert(error.message)
        return
      }
    }

    setConfiguracoes(proximasConfiguracoes)
    setConfiguracoesSalvas('Configuracoes salvas.')
    window.setTimeout(() => setConfiguracoesSalvas(''), 2600)
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
              <small>{configuracoes.microarea}</small>
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
            <span>{configuracoes.unidadeSaude}</span>
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
              <ListaFamilias familias={familiasComEndereco.filter(f => f.status !== 'em_dia')} titulo={fraseQuantidade(familiasComEndereco.filter(f => f.status !== 'em_dia').length, 'familia prioritaria', 'familias prioritarias')} prazoVisitaDias={configuracoes.diasParaVisitaAtrasada} />
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
            <ListaFamilias familias={familiasComEndereco} titulo="Cadastradas" prazoVisitaDias={configuracoes.diasParaVisitaAtrasada} onEdit={editarFamilia} onDelete={excluirFamilia} />
          </section>
        )}

        {tela === 'moradores' && (
          <section className="screen two-column residents-screen animate-in">
            <CrudCard title={moradorEditando ? 'Editar Morador' : 'Novo Morador'}>
              <form className="form-grid" onSubmit={adicionarMorador} key={moradorEditando?.id ?? 'novo-morador'}>
                <label>
                  Nome completo
                  <input name="nome" placeholder="Ex.: Maria Souza" defaultValue={moradorEditando?.nome ?? ''} required />
                </label>
                <label>
                  CPF
                  <input name="cpf" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" defaultValue={moradorEditando?.cpf ?? ''} required />
                </label>
                <label>
                  CNS
                  <input name="cns" inputMode="numeric" maxLength={15} placeholder="Cartao Nacional de Saude" defaultValue={moradorEditando?.cns ?? ''} />
                </label>
                <label>
                  NIS
                  <input name="nis" inputMode="numeric" maxLength={14} placeholder="Numero de Identificacao Social" defaultValue={moradorEditando?.nis ?? ''} />
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
                  <input name="peso" inputMode="decimal" placeholder="Kg" defaultValue={moradorEditando?.peso ?? ''} />
                </label>
                <label>
                  Altura
                  <input name="altura" inputMode="decimal" placeholder="Metros. Ex.: 1,65" defaultValue={moradorEditando?.altura ?? ''} />
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
            <div className="stack-list">
              <ListaMoradores
                moradores={resultadosBusca}
                titulo="Lista"
                onEdit={editarMorador}
                onDelete={excluirMorador}
                onVaccines={(morador) => {
                  setMoradorVacinaId(morador.id)
                  navegarPara('vacinas')
                }}
              />
            </div>
          </section>
        )}

        {tela === 'visitas' && (
          <section className="screen two-column animate-in">
            <CrudCard title={visitaEditando ? 'Editar Visita' : 'Registrar Visita'}>
              <form className="form-grid" onSubmit={registrarVisita} key={visitaEditando?.id ?? 'nova-visita'}>
                <label>
                  Familia visitada
                  <select name="familiaId" defaultValue={visitaEditando?.familiaId ?? ''} required>
                    {familias.map((item) => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Data da visita domiciliar
                  <input name="data" type="date" defaultValue={visitaEditando?.data ?? isoHoje} required />
                </label>
                <label>
                  ACS responsavel
                  <input name="acs" placeholder="Nome da ACS" defaultValue={visitaEditando?.acs ?? 'Adriellen Guimaraes'} />
                </label>
                <label>
                  Pessoas encontradas
                  <input
                    name="pessoasEncontradas"
                    placeholder="Quem estava na residencia"
                    defaultValue={visitaEditando?.pessoasEncontradas ?? ''}
                  />
                </label>
                <label>
                  Condicoes acompanhadas
                  <input name="condicoes" placeholder="Hipertensao, gestante, crianca, idoso..." defaultValue={visitaEditando?.condicoes ?? ''} />
                </label>
                <label>
                  Proxima visita recomendada
                  <input name="proximaVisita" type="date" defaultValue={visitaEditando?.proximaVisita ?? ''} />
                </label>
                <CheckGrid
                  items={[
                    ['vacinaAtualizada', 'Vacina atualizada'],
                    ['preNatalAtualizado', 'Pre-natal atualizado'],
                    ['medicamentoConfirmado', 'Medicamento confirmado'],
                  ]}
                  values={visitaEditando ?? undefined}
                />
                <label>
                  Observacoes da visita
                  <textarea
                    name="observacoes"
                    placeholder="Orientacoes, pendencias e encaminhamentos"
                    defaultValue={visitaEditando?.observacoes ?? ''}
                  />
                </label>
                <label>
                  Status da visita
                  <select name="status" defaultValue={visitaEditando?.status ?? 'concluida'}>
                    <option value="concluida">Concluida</option>
                    <option value="pendente">Pendente</option>
                    <option value="retorno_necessario">Retorno necessario</option>
                  </select>
                </label>
                <div className="form-actions">
                  <button className="primary-button">{visitaEditando ? 'Atualizar' : 'Registrar'}</button>
                  {visitaEditando && (
                    <button className="secondary-button" type="button" onClick={() => setVisitaEditando(null)}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </CrudCard>
            <ListaVisitas visitas={visitasDetalhadas} onEdit={editarVisita} onDelete={excluirVisita} />
          </section>
        )}

        {tela === 'vacinas' && (
          <section className="screen vaccine-screen animate-in">
            <CadernetaVacinal
              moradores={moradoresDetalhados}
              moradorId={moradorVacinaSelecionadoId}
              registros={vacinas}
              onSelectMorador={setMoradorVacinaId}
              onSave={salvarVacinaMorador}
              onDelete={excluirVacinaMorador}
            />
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
              <form className="form-grid" onSubmit={salvarConfiguracoes} key={`${configuracoes.unidadeSaude}-${configuracoes.microarea}`}>
                <label>
                  Unidade de saude
                  <input name="unidadeSaude" defaultValue={configuracoes.unidadeSaude} placeholder="Ex.: UBS Posto da Feira" required />
                </label>
                <label>
                  Microarea
                  <input name="microarea" defaultValue={configuracoes.microarea} placeholder="Ex.: Microarea 04" required />
                </label>
                <label>
                  Dias para visita atrasada
                  <input name="diasParaVisitaAtrasada" type="number" min="1" defaultValue={configuracoes.diasParaVisitaAtrasada} required />
                </label>
                <label className="check-item inline-check">
                  <input name="backupAutomatico" type="checkbox" defaultChecked={configuracoes.backupAutomatico} />
                  <span>Marcar backup automatico como ativo</span>
                </label>
                {configuracoesSalvas && <p className="form-success">{configuracoesSalvas}</p>}
                <button className="primary-button">Salvar</button>
              </form>
            </CrudCard>
            <CrudCard title="Ambiente">
              <div className="settings-list">
                <p>
                  <strong>Banco de dados</strong>
                  <span>{supabaseConfigurado ? 'Supabase conectado' : 'Modo demonstracao local'}</span>
                </p>
                <p>
                  <strong>Login demo</strong>
                  <span>{loginDemoPermitido ? 'Permitido apenas no desenvolvimento' : 'Bloqueado neste ambiente'}</span>
                </p>
                <p>
                  <strong>Ciclo de visita</strong>
                  <span>{configuracoes.diasParaVisitaAtrasada} dias</span>
                </p>
              </div>
            </CrudCard>
          </section>
        )}

        <nav className="mobile-bottom-nav">
          {[
            { id: 'dashboard' as Tela, label: 'Inicio', icon: Activity },
            { id: 'familias' as Tela, label: 'Familias', icon: Home },
            { id: 'visitas' as Tela, label: 'Visitas', icon: CalendarCheck },
            { id: 'vacinas' as Tela, label: 'Vacinas', icon: Syringe },
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
  prazoVisitaDias,
  onEdit,
  onDelete,
}: {
  familias: (Familia & { endereco: string; bairro: string })[]
  titulo: string
  prazoVisitaDias: number
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
              <p className={`deadline-text ${familia.status}`}>{textoPrazoVisita(familia.ultimaVisita, prazoVisitaDias)}</p>
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
  onVaccines,
}: {
  moradores: (Morador & { idade: number; crianca: boolean; idoso: boolean; familia: string; endereco: string; vacinaPendente?: boolean; totalVacinasPendentes?: number })[]
  titulo: string
  onEdit?: (morador: Morador) => void
  onDelete?: (id: EntityId) => void
  onVaccines?: (morador: Morador) => void
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
                <small>
                  {morador.idade} anos - {morador.familia}
                  {morador.vacinaPendente ? ` - ${morador.totalVacinasPendentes || 1} vacina(s) pendente(s)` : ''}
                </small>
              </div>
              {(onEdit || onDelete || onVaccines) && (
                <div className="card-actions">
                  {onVaccines && (
                    <button className="icon-action" type="button" onClick={() => onVaccines(morador)} aria-label="Abrir caderneta vacinal">
                      <Syringe size={17} />
                    </button>
                  )}
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

function CadernetaVacinal({
  moradores,
  moradorId,
  registros,
  onSelectMorador,
  onSave,
  onDelete,
}: {
  moradores: (Morador & { idade: number; familia: string; endereco: string })[]
  moradorId: EntityId | ''
  registros: VacinaRegistro[]
  onSelectMorador: (id: EntityId) => void
  onSave: (registro: Omit<VacinaRegistro, 'id'>, id?: EntityId) => Promise<void>
  onDelete: (id: EntityId) => void
}) {
  const [registroEditando, setRegistroEditando] = useState<VacinaRegistro | null>(null)
  const morador = moradores.find((item) => String(item.id) === String(moradorId))
  const registrosMorador = registros.filter((item) => morador && String(item.moradorId) === String(morador.id))
  const sugestoes = morador ? calendarioVacinalSugerido(morador, registrosMorador).slice(0, 8) : []
  const pendentes = morador ? pendenciasVacinais(morador, registrosMorador) : []

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!morador) return
    const form = event.currentTarget
    const dados = new FormData(form)
    const status = String(dados.get('status')) as StatusVacina
    await onSave(
      {
        moradorId: String(dados.get('moradorId')),
        nome: String(dados.get('nome')),
        dose: String(dados.get('dose')),
        dataAplicacao: String(dados.get('dataAplicacao')),
        dataPrevista: String(dados.get('dataPrevista')),
        status,
        observacoes: String(dados.get('observacoes')),
      },
      registroEditando?.id,
    )
    setRegistroEditando(null)
    form.reset()
  }

  return (
    <section className="panel vaccine-panel">
      <div className="panel-title-row">
        <h2>Caderneta vacinal</h2>
        <span>{pendentes.length}</span>
      </div>
      {moradores.length === 0 && <p className="empty-state">Cadastre um morador para controlar vacinas.</p>}
      {moradores.length > 0 && (
        <>
          <form className="form-grid vaccine-form" onSubmit={salvar} key={registroEditando?.id ?? String(moradorId)}>
            <label>
              Morador
              <select
                name="moradorId"
                value={registroEditando?.moradorId ?? moradorId}
                onChange={(event) => onSelectMorador(event.target.value)}
                required
              >
                {moradores.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            </label>
            <label>
              Vacina
              <select name="nome" defaultValue={registroEditando?.nome ?? 'Influenza'} required>
                {vacinasCatalogo.map((vacina) => (
                  <option key={vacina}>{vacina}</option>
                ))}
              </select>
            </label>
            <label>
              Dose
              <input name="dose" placeholder="Ex.: 1a dose, reforco, anual" defaultValue={registroEditando?.dose ?? ''} required />
            </label>
            <label>
              Data prevista
              <input name="dataPrevista" type="date" defaultValue={registroEditando?.dataPrevista ?? ''} />
            </label>
            <label>
              Data aplicada
              <input name="dataAplicacao" type="date" defaultValue={registroEditando?.dataAplicacao ?? ''} />
            </label>
            <label>
              Status
              <select name="status" defaultValue={registroEditando?.status ?? 'pendente'}>
                <option value="aplicada">Aplicada</option>
                <option value="pendente">Pendente</option>
                <option value="atrasada">Atrasada</option>
              </select>
            </label>
            <label>
              Observacoes
              <textarea name="observacoes" placeholder="Lote, UBS, orientacao ou motivo da pendencia" defaultValue={registroEditando?.observacoes ?? ''} />
            </label>
            <div className="form-actions">
              <button className="primary-button">{registroEditando ? 'Atualizar vacina' : 'Salvar vacina'}</button>
              {registroEditando && (
                <button className="secondary-button" type="button" onClick={() => setRegistroEditando(null)}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {morador && (
            <div className="vaccine-summary">
              <strong>{morador.nome}</strong>
              <span>{morador.idade} anos - {morador.familia}</span>
              <small>{pendentes.length ? `${pendentes.length} pendencia(s) para conferir` : 'Sem pendencia detalhada registrada'}</small>
            </div>
          )}

          <div className="vaccine-list">
            <h3>Calendario sugerido</h3>
            {sugestoes.length === 0 && <p className="empty-state">Sem sugestoes para este perfil.</p>}
            {sugestoes.map((item) => (
              <article key={`${item.nome}-${item.dose}`} className="vaccine-row">
                <div>
                  <strong>{item.nome}</strong>
                  <small>{item.dose} {item.dataPrevista ? `- prevista ${formatarData(item.dataPrevista)}` : ''}</small>
                </div>
                <span className={`status-pill ${item.status}`}>{statusTexto(item.status)}</span>
              </article>
            ))}
          </div>

          <div className="vaccine-list">
            <h3>Registros salvos</h3>
            {registrosMorador.length === 0 && <p className="empty-state">Nenhuma vacina registrada para este morador.</p>}
            {registrosMorador.map((registro) => (
              <article key={registro.id} className="vaccine-row saved">
                <div>
                  <strong>{registro.nome}</strong>
                  <small>
                    {registro.dose}
                    {registro.dataAplicacao ? ` - aplicada ${formatarData(registro.dataAplicacao)}` : ''}
                    {!registro.dataAplicacao && registro.dataPrevista ? ` - prevista ${formatarData(registro.dataPrevista)}` : ''}
                  </small>
                </div>
                <span className={`status-pill ${registro.status}`}>{statusTexto(registro.status)}</span>
                <div className="card-actions">
                  <button className="icon-action" type="button" onClick={() => setRegistroEditando(registro)} aria-label="Editar vacina">
                    <Edit3 size={16} />
                  </button>
                  <button className="icon-action danger" type="button" onClick={() => onDelete(registro.id)} aria-label="Excluir vacina">
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
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

function ListaVisitas({
  visitas,
  onEdit,
  onDelete,
}: {
  visitas: (Visita & { familia: string; endereco: string })[]
  onEdit?: (visita: Visita) => void
  onDelete?: (visita: Visita) => void
}) {
  const [buscaHistorico, setBuscaHistorico] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')

  const visitasFiltradas = visitas.filter((visita) => {
    const termo = normalizarBusca(buscaHistorico.trim())
    const dentroDaBusca = !termo || [
      visita.familia,
      visita.endereco,
      visita.acs,
      visita.pessoasEncontradas,
      visita.condicoes,
      visita.observacoes,
      statusTexto(visita.status),
    ].some((valor) => correspondeBusca(valor, termo))
    const depoisDoInicio = !dataInicio || visita.data >= dataInicio
    const antesDoFim = !dataFim || visita.data <= dataFim
    const statusOk = !statusFiltro || visita.status === statusFiltro
    return dentroDaBusca && depoisDoInicio && antesDoFim && statusOk
  })

  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2>Visitas registradas</h2>
        <span>{visitasFiltradas.length}</span>
      </div>
      <div className="visit-filters">
        <label>
          Buscar
          <input value={buscaHistorico} onChange={(event) => setBuscaHistorico(event.target.value)} placeholder="Familia, ACS, condicao..." />
        </label>
        <label>
          De
          <input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
        </label>
        <label>
          Ate
          <input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
        </label>
        <label>
          Status
          <select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)}>
            <option value="">Todos</option>
            <option value="concluida">Concluida</option>
            <option value="pendente">Pendente</option>
            <option value="retorno_necessario">Retorno necessario</option>
          </select>
        </label>
      </div>
      <div className="stack-list">
        {visitasFiltradas.length === 0 && <p className="empty-state">Nenhuma visita encontrada.</p>}
        {visitasFiltradas.map((visita) => (
          <article key={visita.id} className="visit-card">
            <div className="visit-card-head">
              <CalendarCheck size={18} />
              <div>
                <strong>{visita.familia}</strong>
                <small>{visita.endereco || 'Endereco nao informado'}</small>
              </div>
              <div className="visit-card-actions">
                <span className={`status-pill ${visita.status}`}>{statusTexto(visita.status)}</span>
                <div className="card-actions">
                  {onEdit && (
                    <button className="icon-action" type="button" title="Editar visita" onClick={() => onEdit(visita)}>
                      <Edit3 size={15} />
                    </button>
                  )}
                  {onDelete && (
                    <button className="icon-action danger" type="button" title="Excluir visita" onClick={() => onDelete(visita)}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="visit-card-body">
              <span>Data: {formatarData(visita.data)}</span>
              <span>ACS: {visita.acs || 'Nao informado'}</span>
              {visita.pessoasEncontradas && <span>Pessoas: {visita.pessoasEncontradas}</span>}
              {visita.condicoes && <span>Condicoes: {visita.condicoes}</span>}
              {visita.proximaVisita && <span>Proxima: {formatarData(visita.proximaVisita)}</span>}
              {visita.observacoes && <p>{visita.observacoes}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function textoUltimaVisita(data: string) {
  if (!data) return 'Sem visita registrada'
  return `Ultima visita: ${formatarData(data)} (${diasDesde(data)} dias)`
}

function textoPrazoVisita(data: string, prazoDias = PRAZO_VISITA_DIAS) {
  if (!data) return `Primeira visita pendente. Ciclo padrao: ${prazoDias} dias.`
  const dias = diasDesde(data)
  const proxima = adicionarDias(data, prazoDias)
  const saldo = prazoDias - dias
  if (saldo > 0) return `Proxima visita ate ${formatarData(proxima)} (${saldo} dias restantes)`
  if (saldo === 0) return `Visita vence hoje (${formatarData(proxima)})`
  return `Visita atrasada ha ${Math.abs(saldo)} dias. Passar novamente.`
}

function adicionarMeses(data: string, meses: number) {
  if (!data) return ''
  const base = new Date(`${data}T00:00:00`)
  base.setMonth(base.getMonth() + meses)
  return base.toISOString().slice(0, 10)
}

function mesesDesdeNascimento(data: string) {
  if (!data) return 0
  const nascimento = new Date(`${data}T00:00:00`)
  return (hoje.getFullYear() - nascimento.getFullYear()) * 12 + hoje.getMonth() - nascimento.getMonth()
}

function statusVacinaPrevista(dataPrevista: string, registro?: VacinaRegistro): StatusVacina {
  if (registro?.status) return registro.status
  if (!dataPrevista) return 'pendente'
  return dataPrevista < isoHoje ? 'atrasada' : 'pendente'
}

function calendarioVacinalSugerido(morador: Morador, registros: VacinaRegistro[]) {
  const idadeMeses = mesesDesdeNascimento(morador.nascimento)
  const encontrarRegistro = (nome: string, dose: string) =>
    registros.find((registro) => normalizarBusca(registro.nome) === normalizarBusca(nome) && normalizarBusca(registro.dose) === normalizarBusca(dose))

  const sugestoesBase =
    idadeMeses <= 72
      ? [
          ['BCG', 'Ao nascer', 0],
          ['Hepatite B', 'Ao nascer', 0],
          ['Pentavalente', '1a dose', 2],
          ['VIP', '1a dose', 2],
          ['Rotavirus', '1a dose', 2],
          ['Pneumococica', '1a dose', 2],
          ['Meningococica C', '1a dose', 3],
          ['Pentavalente', '2a dose', 4],
          ['VIP', '2a dose', 4],
          ['Rotavirus', '2a dose', 4],
          ['Pentavalente', '3a dose', 6],
          ['VIP', '3a dose', 6],
          ['Febre amarela', 'Dose inicial', 9],
          ['Triplice viral', '1a dose', 12],
          ['Pneumococica', 'Reforco', 12],
          ['Meningococica C', 'Reforco', 12],
          ['DTP', '1o reforco', 15],
          ['Triplice viral', '2a dose', 15],
          ['DTP', '2o reforco', 48],
        ]
      : [
          ['Influenza', `Anual ${hoje.getFullYear()}`, 0],
          ['COVID-19', 'Conferir reforco', 0],
          ['dT', 'Conferir reforco 10 anos', 0],
        ]

  const sugestoesGestante = morador.gestante
    ? [
        ['dTpa', 'Gestante', 0],
        ['Influenza', `Gestante ${hoje.getFullYear()}`, 0],
        ['Hepatite B', 'Conferir esquema', 0],
      ]
    : []

  return [...sugestoesBase, ...sugestoesGestante]
    .filter(([, , mes]) => idadeMeses >= Number(mes) || Number(mes) === 0)
    .map(([nome, dose, mes]) => {
      const dataPrevista = Number(mes) > 0 ? adicionarMeses(morador.nascimento, Number(mes)) : ''
      const registro = encontrarRegistro(String(nome), String(dose))
      return {
        nome: String(nome),
        dose: String(dose),
        dataPrevista,
        status: statusVacinaPrevista(dataPrevista, registro),
      }
    })
}

function pendenciasVacinais(morador: Morador, registros: VacinaRegistro[]) {
  if (!registros.length && morador.vacinaEmDia) return []
  const sugestoesPendentes = calendarioVacinalSugerido(morador, registros).filter((item) => item.status !== 'aplicada')
  const registrosPendentes = registros.filter((registro) => registro.status !== 'aplicada')
  const chaves = new Set<string>()
  return [...registrosPendentes, ...sugestoesPendentes].filter((item) => {
    const chave = `${normalizarBusca(item.nome)}-${normalizarBusca(item.dose)}`
    if (chaves.has(chave)) return false
    chaves.add(chave)
    return true
  })
}

function pendenciaMorador(morador: Partial<Morador> & { idoso?: boolean; crianca?: boolean; statusFamilia?: StatusVisita; vacinaPendente?: boolean }) {
  const pendencias = []
  if (morador.statusFamilia === 'atrasada') pendencias.push('Visita atrasada')
  if (morador.gestante && !morador.preNatalEmDia) pendencias.push('Pre-natal pendente')
  if (morador.vacinaPendente || !morador.vacinaEmDia) pendencias.push('Vacina pendente')
  if (morador.hipertenso) pendencias.push('Hipertensao')
  return pendencias.slice(0, 1).join('') || 'Em dia'
}

export default App
