import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Baby,
  CalendarCheck,
  ClipboardList,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  HeartPulse,
  Home,
  LogOut,
  MapPinned,
  Menu,
  Pill,
  RotateCcw,
  Save,
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
type ModoAuth = 'entrar' | 'cadastro' | 'recuperar'
type TipoRelatorio = 'indicadores' | 'familias' | 'visitas' | 'vacinas'

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

type RelatorioDados = {
  titulo: string
  subtitulo: string
  colunas: string[]
  linhas: (string | number)[][]
}

const hoje = new Date()
const isoHoje = hoje.toISOString().slice(0, 10)
const PRAZO_VISITA_DIAS = 30
const configuracoesIniciais: ConfiguracoesApp = {
  unidadeSaude: 'Posto da Feira',
  microarea: 'Microárea principal',
  diasParaVisitaAtrasada: PRAZO_VISITA_DIAS,
  backupAutomatico: false,
}
const loginDemoPermitido = !import.meta.env.PROD && !supabaseConfigurado

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
    acs: 'Adriellen Guimarães',
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
    acs: 'Adriellen Guimarães',
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

const vacinasIniciais: VacinaRegistro[] = [
  {
    id: 1,
    moradorId: 2,
    nome: 'Pentavalente',
    dose: '2ª dose',
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
    observacoes: 'Prioridade por idade e condições crônicas.',
  },
]

const vacinasCatalogo = [
  'BCG',
  'Hepatite B',
  'Pentavalente',
  'VIP',
  'Rotavírus',
  'Pneumocócica',
  'Meningocócica C',
  'Febre amarela',
  'Tríplice viral',
  'DTP',
  'Influenza',
  'COVID-19',
  'dT',
  'dTpa',
]

const menus = [
  { id: 'dashboard' as Tela, label: 'Início', icon: Activity },
  { id: 'logradouros' as Tela, label: 'Logradouros', icon: MapPinned },
  { id: 'familias' as Tela, label: 'Famílias', icon: Home },
  { id: 'moradores' as Tela, label: 'Moradores', icon: UsersRound },
  { id: 'visitas' as Tela, label: 'Visitas', icon: CalendarCheck },
  { id: 'vacinas' as Tela, label: 'Vacinas', icon: Syringe },
  { id: 'indicadores' as Tela, label: 'Indicadores', icon: HeartPulse },
  { id: 'relatorios' as Tela, label: 'Relatórios', icon: ClipboardList },
  { id: 'configuracoes' as Tela, label: 'Configurações', icon: Settings },
]

const caminhoPorTela: Record<Tela, string> = {
  dashboard: '/',
  logradouros: '/logradouros',
  familias: '/familias',
  moradores: '/moradores',
  visitas: '/visitas',
  vacinas: '/vacinas',
  indicadores: '/indicadores',
  relatorios: '/relatorios',
  configuracoes: '/configuracoes',
}

const telaPorCaminho = Object.entries(caminhoPorTela).reduce<Record<string, Tela>>((acc, [telaAtual, caminho]) => {
  acc[caminho] = telaAtual as Tela
  return acc
}, {})

function telaDaUrl() {
  const caminho = window.location.pathname.replace(/\/$/, '') || '/'
  return telaPorCaminho[caminho] ?? 'dashboard'
}

const gruposIndicadores = [
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

function saldoDiasVisita(data: string, prazoDias = PRAZO_VISITA_DIAS) {
  if (!data) return -1
  return prazoDias - diasDesde(data)
}

function diasAteData(data: string) {
  if (!data) return null
  const base = new Date(`${isoHoje}T00:00:00`)
  const alvo = new Date(`${data}T00:00:00`)
  return Math.round((alvo.getTime() - base.getTime()) / 86_400_000)
}

function statusProximaVisita(data: string) {
  const saldo = diasAteData(data)
  if (saldo === null) {
    return {
      classe: 'sem_data',
      titulo: 'Sem data',
      detalhe: 'Defina a próxima visita',
      dias: null,
    }
  }
  if (saldo < 0) {
    const dias = Math.abs(saldo)
    return {
      classe: 'atrasada',
      titulo: 'Atrasada',
      detalhe: `${fraseQuantidade(dias, 'dia de atraso', 'dias de atraso')}`,
      dias: saldo,
    }
  }
  if (saldo === 0) {
    return {
      classe: 'proxima',
      titulo: 'Vence hoje',
      detalhe: 'Visita recomendada para hoje',
      dias: saldo,
    }
  }
  if (saldo <= 7) {
    return {
      classe: 'proxima',
      titulo: 'Próxima',
      detalhe: `${fraseQuantidade(saldo, 'dia restante', 'dias restantes')}`,
      dias: saldo,
    }
  }
  return {
    classe: 'em_dia',
    titulo: 'Agendada',
    detalhe: `${fraseQuantidade(saldo, 'dia restante', 'dias restantes')}`,
    dias: saldo,
  }
}

function formatarData(data: string) {
  if (!data) return '-'
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

function baixarArquivo(nome: string, conteudo: BlobPart, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  URL.revokeObjectURL(url)
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
    concluida: 'Concluída',
    retorno_necessario: 'Retorno necessário',
    aplicada: 'Aplicada',
  }
  return mapa[status]
}

function App() {
  const [logado, setLogado] = useState(false)
  const [carregando, setCarregando] = useState(supabaseConfigurado)
  const [usuarioId, setUsuarioId] = useState('')
  const [erroLogin, setErroLogin] = useState('')
  const [mensagemLogin, setMensagemLogin] = useState('')
  const [modoAuth, setModoAuth] = useState<ModoAuth>('entrar')
  const [tela, setTela] = useState<Tela>(() => telaDaUrl())
  const [menuAberto, setMenuAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroRapido, setFiltroRapido] = useState('Mês')
  const [logradouros, setLogradouros] = usePersistentState('acs:logradouros', logradourosIniciais)
  const [familias, setFamilias] = usePersistentState('acs:familias', familiasIniciais)
  const [moradores, setMoradores] = usePersistentState('acs:moradores', moradoresIniciais)
  const [visitas, setVisitas] = usePersistentState('acs:visitas', visitasIniciais)
  const [vacinas, setVacinas] = usePersistentState('acs:vacinas', vacinasIniciais)
  const [configuracoes, setConfiguracoes] = usePersistentState('acs:configuracoes', configuracoesIniciais)
  const [configuracoesSalvas, setConfiguracoesSalvas] = useState('')
  const [mensagemConfiguracoes, setMensagemConfiguracoes] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('indicadores')
  const [grupoRelatorio, setGrupoRelatorio] = useState('Vacinas pendentes')
  const [relatorioInicio, setRelatorioInicio] = useState('')
  const [relatorioFim, setRelatorioFim] = useState('')
  const [relatorioLogradouro, setRelatorioLogradouro] = useState('')
  const [relatorioStatus, setRelatorioStatus] = useState('')
  const [grupoAtivo, setGrupoAtivo] = useState('Vacinas pendentes')
  const [logradouroEditando, setLogradouroEditando] = useState<Logradouro | null>(null)
  const [familiaEditando, setFamiliaEditando] = useState<Familia | null>(null)
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null)
  const [visitaEditando, setVisitaEditando] = useState<Visita | null>(null)
  const [moradorVacinaId, setMoradorVacinaId] = useState<EntityId | ''>('')

  function alterarModoAuth(proximoModo: ModoAuth) {
    setModoAuth(proximoModo)
    setErroLogin('')
    setMensagemLogin('')
  }

  function navegarPara(proximaTela: Tela) {
    const proximoCaminho = caminhoPorTela[proximaTela]
    if (window.location.pathname !== proximoCaminho) {
      window.history.pushState({ tela: proximaTela }, '', proximoCaminho)
    }
    setTela(proximaTela)
    setMenuAberto(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const aoVoltar = () => {
      setTela(telaDaUrl())
      setMenuAberto(false)
      window.scrollTo({ top: 0, behavior: 'auto' })
    }

    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

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
    if (error) console.warn('Não foi possível sincronizar perfil do usuário:', error.message)
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
      console.warn('Tabela de vacinas ainda não disponível no Supabase:', vacinasDb.error.message)
    } else {
      setVacinas((vacinasDb.data ?? []).map(mapVacina))
    }
  }, [setConfiguracoes, setFamilias, setLogradouros, setMoradores, setVacinas, setVisitas])

  async function obterUsuarioAutenticado() {
    if (!supabase) return ''
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw new Error('Sessão expirada. Saia e entre novamente.')
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
            familia: familia?.nome ?? 'Família não encontrada',
            endereco: familia?.endereco ?? '',
          }
        })
        .sort((a, b) => b.data.localeCompare(a.data)),
    [visitas, familiasComEndereco],
  )

  const indicadores = useMemo(() => {
    const visitasMes = visitas.filter((visita) => visita.data.slice(0, 7) === isoHoje.slice(0, 7)).length
    return [
      { label: 'Total de famílias', valor: familias.length, icon: Home, status: 'neutro' },
      { label: 'Total de moradores', valor: moradores.length, icon: UsersRound, status: 'neutro' },
      { label: 'Visitas no mês', valor: visitasMes, icon: CalendarCheck, status: 'ok' },
      { label: 'Visitas pendentes', valor: familiasComEndereco.filter((item) => item.status === 'pendente').length, icon: ClipboardList, status: 'atencao' },
      { label: 'Visitas atrasadas', valor: familiasComEndereco.filter((item) => item.status === 'atrasada').length, icon: AlertTriangle, status: 'risco' },
      { label: 'Gestantes', valor: moradores.filter((item) => item.gestante).length, icon: HeartPulse, status: 'atencao' },
      { label: 'Crianças 0 a 2', valor: moradoresDetalhados.filter((item) => item.crianca).length, icon: Baby, status: 'atencao' },
      { label: 'Idosos 60+', valor: moradoresDetalhados.filter((item) => item.idoso).length, icon: UserRound, status: 'neutro' },
      { label: 'Hipertensos', valor: moradores.filter((item) => item.hipertenso).length, icon: Activity, status: 'atencao' },
      { label: 'Diabéticos', valor: moradores.filter((item) => item.diabetico).length, icon: HeartPulse, status: 'atencao' },
      { label: 'Hipertensos e diabéticos', valor: moradores.filter((item) => item.hipertenso && item.diabetico).length, icon: ShieldCheck, status: 'risco' },
      { label: 'Bolsa Família', valor: moradores.filter((item) => item.bolsaFamilia).length, icon: UsersRound, status: 'neutro' },
      { label: 'Remédio controlado', valor: moradores.filter((item) => item.remedioControlado).length, icon: Pill, status: 'atencao' },
      { label: 'Vacinas pendentes', valor: moradoresDetalhados.filter((item) => item.vacinaPendente).length, icon: Syringe, status: 'risco' },
      { label: 'Pré-natal pendente', valor: moradores.filter((item) => item.gestante && !item.preNatalEmDia).length, icon: Baby, status: 'risco' },
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

  const familiasDashboard = useMemo(() => {
    const prazoDias = configuracoes.diasParaVisitaAtrasada
    return familiasComEndereco.filter((familia) => {
      const saldo = saldoDiasVisita(familia.ultimaVisita, prazoDias)
      if (filtroRapido === 'Hoje') return saldo <= 0
      if (filtroRapido === 'Semana') return saldo <= 7
      if (filtroRapido === 'Pendências') return familia.status !== 'em_dia'
      if (filtroRapido === 'Prioridades') {
        const moradoresDaFamilia = moradoresDetalhados.filter((morador) => String(morador.familiaId) === String(familia.id))
        return familia.status === 'atrasada' || moradoresDaFamilia.some((morador) => morador.vacinaPendente || (morador.gestante && !morador.preNatalEmDia))
      }
      return familia.status !== 'em_dia'
    })
  }, [configuracoes.diasParaVisitaAtrasada, familiasComEndereco, filtroRapido, moradoresDetalhados])

  const moradoresDashboard = useMemo(() => {
    if (filtroRapido !== 'Pendências' && filtroRapido !== 'Prioridades') return resultadosBusca.slice(0, 5)
    return resultadosBusca
      .filter((morador) => pendenciaMorador(morador) !== 'Em dia')
      .slice(0, 5)
  }, [filtroRapido, resultadosBusca])

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
      'Vacinas pendentes': (item) => item.vacinaPendente,
      'Pré-natal pendente': (item) => item.gestante && !item.preNatalEmDia,
      'Visitas atrasadas': (item) => item.statusFamilia === 'atrasada',
      'Visitas pendentes': (item) => item.statusFamilia === 'pendente',
    }
    return moradoresDetalhados.filter(filtros[grupoAtivo])
  }, [grupoAtivo, moradoresDetalhados])

  const familiasRelatorio = useMemo(() => (
    familiasComEndereco.filter((familia) => {
      const logradouroOk = !relatorioLogradouro || String(familia.logradouroId) === String(relatorioLogradouro)
      const statusOk = !relatorioStatus || familia.status === relatorioStatus
      return logradouroOk && statusOk
    })
  ), [familiasComEndereco, relatorioLogradouro, relatorioStatus])

  const moradoresRelatorio = useMemo(() => {
    const filtros: Record<string, (item: (typeof moradoresDetalhados)[number]) => boolean> = {
      'Bolsa Família': (item) => item.bolsaFamilia,
      Hipertensos: (item) => item.hipertenso,
      Diabéticos: (item) => item.diabetico,
      'Hipertensos e diabéticos': (item) => item.hipertenso && item.diabetico,
      'Idosos acima de 60 anos': (item) => item.idoso,
      Gestantes: (item) => item.gestante,
      'Crianças de 0 a 2 anos': (item) => item.crianca,
      'Pessoas com remédio controlado': (item) => item.remedioControlado,
      'Vacinas pendentes': (item) => item.vacinaPendente,
      'Pré-natal pendente': (item) => item.gestante && !item.preNatalEmDia,
      'Visitas atrasadas': (item) => item.statusFamilia === 'atrasada',
      'Visitas pendentes': (item) => item.statusFamilia === 'pendente',
    }
    return moradoresDetalhados.filter((morador) => {
      const familia = familiasComEndereco.find((item) => String(item.id) === String(morador.familiaId))
      const logradouroOk = !relatorioLogradouro || String(familia?.logradouroId) === String(relatorioLogradouro)
      return logradouroOk && filtros[grupoRelatorio](morador)
    })
  }, [familiasComEndereco, grupoRelatorio, moradoresDetalhados, relatorioLogradouro])

  const visitasRelatorio = useMemo(() => (
    visitasDetalhadas.filter((visita) => {
      const familia = familiasComEndereco.find((item) => String(item.id) === String(visita.familiaId))
      const logradouroOk = !relatorioLogradouro || String(familia?.logradouroId) === String(relatorioLogradouro)
      const inicioOk = !relatorioInicio || visita.data >= relatorioInicio
      const fimOk = !relatorioFim || visita.data <= relatorioFim
      const statusOk = !relatorioStatus || visita.status === relatorioStatus
      return logradouroOk && inicioOk && fimOk && statusOk
    })
  ), [familiasComEndereco, relatorioFim, relatorioInicio, relatorioLogradouro, relatorioStatus, visitasDetalhadas])

  const vacinasRelatorio = useMemo(() => (
    vacinas
      .map((vacina) => {
        const morador = moradoresDetalhados.find((item) => String(item.id) === String(vacina.moradorId))
        const familia = familiasComEndereco.find((item) => morador && String(item.id) === String(morador.familiaId))
        return { ...vacina, morador, familia }
      })
      .filter((vacina) => {
        const logradouroOk = !relatorioLogradouro || String(vacina.familia?.logradouroId) === String(relatorioLogradouro)
        const inicioOk = !relatorioInicio || (vacina.dataPrevista || vacina.dataAplicacao) >= relatorioInicio
        const fimOk = !relatorioFim || (vacina.dataPrevista || vacina.dataAplicacao) <= relatorioFim
        const statusOk = !relatorioStatus || vacina.status === relatorioStatus
        return logradouroOk && inicioOk && fimOk && statusOk
      })
  ), [familiasComEndereco, moradoresDetalhados, relatorioFim, relatorioInicio, relatorioLogradouro, relatorioStatus, vacinas])

  const relatorioDados = useMemo<RelatorioDados>(() => {
    if (tipoRelatorio === 'familias') {
      return {
        titulo: 'Relatório de famílias e domicílios',
        subtitulo: `${familiasRelatorio.length} família(s) filtrada(s)`,
        colunas: ['Família', 'Endereço', 'Responsável', 'Moradores', 'Última visita', 'Status'],
        linhas: familiasRelatorio.map((familia) => [
          familia.nome,
          familia.endereco,
          familia.responsavel,
          familia.quantidadeMoradores,
          formatarData(familia.ultimaVisita),
          statusTexto(familia.status),
        ]),
      }
    }

    if (tipoRelatorio === 'visitas') {
      return {
        titulo: 'Relatório de visitas domiciliares',
        subtitulo: `${visitasRelatorio.length} visita(s) filtrada(s)`,
        colunas: ['Data', 'Família', 'Endereço', 'ACS', 'Status', 'Próxima visita'],
        linhas: visitasRelatorio.map((visita) => [
          formatarData(visita.data),
          visita.familia,
          visita.endereco,
          visita.acs || '-',
          statusTexto(visita.status),
          formatarData(visita.proximaVisita),
        ]),
      }
    }

    if (tipoRelatorio === 'vacinas') {
      return {
        titulo: 'Relatório de vacinas',
        subtitulo: `${vacinasRelatorio.length} registro(s) vacinal(is)`,
        colunas: ['Morador', 'Família', 'Vacina', 'Dose', 'Prevista', 'Status'],
        linhas: vacinasRelatorio.map((vacina) => [
          vacina.morador?.nome ?? 'Morador não encontrado',
          vacina.morador?.familia ?? '-',
          vacina.nome,
          vacina.dose,
          formatarData(vacina.dataPrevista),
          statusTexto(vacina.status),
        ]),
      }
    }

    return {
      titulo: `Relatório de indicadores - ${grupoRelatorio}`,
      subtitulo: `${moradoresRelatorio.length} morador(es) no grupo`,
      colunas: ['Nome', 'CPF', 'Idade', 'Família', 'Endereço', 'Pendência'],
      linhas: moradoresRelatorio.map((morador) => [
        morador.nome,
        morador.cpf || '-',
        morador.idade,
        morador.familia,
        morador.endereco,
        pendenciaMorador(morador),
      ]),
    }
  }, [familiasRelatorio, grupoRelatorio, moradoresRelatorio, tipoRelatorio, vacinasRelatorio, visitasRelatorio])

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroLogin('')
    setMensagemLogin('')
    const dados = new FormData(event.currentTarget)
    const email = String(dados.get('usuario')).trim()
    const senha = String(dados.get('senha'))

    if (supabase) {
      setCarregando(true)
      try {
        if (modoAuth === 'recuperar') {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
          })
          if (error) throw error
          setMensagemLogin('Enviamos as instruções de recuperação para o e-mail informado.')
          return
        }

        if (modoAuth === 'cadastro') {
          const { data, error } = await supabase.auth.signUp({
            email,
            password: senha,
            options: {
              emailRedirectTo: window.location.origin,
            },
          })
          if (error) throw error
          if (data.user && !data.session) {
            setMensagemLogin('Conta criada. Confira seu e-mail para confirmar o acesso.')
            setModoAuth('entrar')
            return
          }
          if (!data.user) throw new Error('Cadastro não retornou usuário.')
          await garantirPerfil(data.user)
          setUsuarioId(data.user.id)
          setLogado(true)
          await carregarDados(data.user.id)
          return
        }

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

    if (modoAuth !== 'entrar') {
      setErroLogin('Cadastro e recuperação de senha exigem Supabase configurado.')
      return
    }

    if (!loginDemoPermitido) {
      setErroLogin('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para liberar o acesso.')
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
    const confirmar = window.confirm('Excluir este logradouro? Famílias vinculadas podem impedir a exclusão.')
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
    const confirmar = window.confirm('Excluir esta família? Moradores e visitas vinculados podem ser removidos.')
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
      alert('Informe um CPF com 11 dígitos.')
      return
    }

    if (cns && cns.length !== 15) {
      alert('Informe um CNS com 15 dígitos ou deixe em branco.')
      return
    }

    if (nis && nis.length !== 11) {
      alert('Informe um NIS com 11 dígitos ou deixe em branco.')
      return
    }

    if (String(dados.get('peso')).trim() && !peso) {
      alert('Informe um peso válido. Exemplo: 72,5')
      return
    }

    if (String(dados.get('altura')).trim() && !altura) {
      alert('Informe uma altura válida. Exemplo: 1,65')
      return
    }

    if (moradores.some((item) => apenasDigitos(item.cpf) === cpf && String(item.id) !== String(moradorEditando?.id))) {
      alert('Já existe um morador cadastrado com este CPF.')
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
    const confirmar = window.confirm('Excluir este morador? O cadastro será removido da família.')
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
        alert(`Não foi possível salvar a vacina. Rode o SQL da tabela vacinas_moradores no Supabase. Detalhe: ${error.message}`)
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
        alert(errorSincronizacao instanceof Error ? errorSincronizacao.message : 'Erro ao atualizar família da visita.')
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
    const confirmar = window.confirm('Excluir esta visita do histórico?')
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
        alert(errorSincronizacao instanceof Error ? errorSincronizacao.message : 'Erro ao atualizar família da visita.')
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
    setConfiguracoesSalvas('Configurações salvas.')
    window.setTimeout(() => setConfiguracoesSalvas(''), 2600)
  }

  async function alterarSenha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMensagemConfiguracoes('')

    if (!supabase) {
      setMensagemConfiguracoes('A troca de senha exige Supabase conectado.')
      return
    }

    if (novaSenha.length < 6) {
      setMensagemConfiguracoes('A nova senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setMensagemConfiguracoes('A confirmação da senha não confere.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) {
      setMensagemConfiguracoes(error.message)
      return
    }

    setNovaSenha('')
    setConfirmarSenha('')
    setMensagemConfiguracoes('Senha atualizada com sucesso.')
  }

  function exportarBackup() {
    const backup = {
      geradoEm: new Date().toISOString(),
      configuracoes,
      logradouros,
      familias,
      moradores,
      visitas,
      vacinas,
    }
    baixarArquivo(
      `acs-backup-${isoHoje}.json`,
      JSON.stringify(backup, null, 2),
      'application/json;charset=utf-8',
    )
    setMensagemConfiguracoes('Backup JSON gerado.')
  }

  function limparDadosLocais() {
    const confirmar = window.confirm('Limpar os dados locais de demonstração deste navegador? Dados salvos no Supabase não serão apagados.')
    if (!confirmar) return
    ;['acs:logradouros', 'acs:familias', 'acs:moradores', 'acs:visitas', 'acs:vacinas', 'acs:configuracoes'].forEach((key) => localStorage.removeItem(key))
    setLogradouros(logradourosIniciais)
    setFamilias(familiasIniciais)
    setMoradores(moradoresIniciais)
    setVisitas(visitasIniciais)
    setVacinas(vacinasIniciais)
    setConfiguracoes(configuracoesIniciais)
    setMensagemConfiguracoes('Dados locais restaurados para demonstração.')
  }

  async function sair() {
    if (supabase) await supabase.auth.signOut()
    setUsuarioId('')
    setLogado(false)
  }

  function exportarPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    const largura = doc.internal.pageSize.getWidth()
    const altura = doc.internal.pageSize.getHeight()
    const totalPendencias = moradoresDetalhados.filter((morador) => pendenciaMorador(morador) !== 'Em dia').length

    doc.setFillColor(13, 63, 37)
    doc.rect(0, 0, largura, 34, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.text(relatorioDados.titulo, 14, 15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`${configuracoes.unidadeSaude} - ${configuracoes.microarea}`, 14, 23)
    doc.text(`Emitido em ${formatarData(isoHoje)}`, largura - 14, 23, { align: 'right' })

    const cards = [
      ['Famílias', familias.length],
      ['Moradores', moradores.length],
      ['Visitas', visitas.length],
      ['Pendências', totalPendencias],
    ]
    cards.forEach(([label, valor], index) => {
      const x = 14 + index * 48
      doc.setFillColor(237, 248, 241)
      doc.roundedRect(x, 43, 40, 18, 3, 3, 'F')
      doc.setTextColor(13, 63, 37)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(String(valor), x + 5, 51)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(String(label), x + 5, 57)
    })

    doc.setTextColor(104, 117, 109)
    doc.setFontSize(9)
    doc.text(relatorioDados.subtitulo, 14, 70)

    autoTable(doc, {
      head: [relatorioDados.colunas],
      body: relatorioDados.linhas,
      startY: 76,
      theme: 'grid',
      margin: { left: 14, right: 14, bottom: 16 },
      headStyles: {
        fillColor: [31, 122, 67],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
      },
      alternateRowStyles: { fillColor: [247, 252, 249] },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 3,
        textColor: [24, 35, 29],
        lineColor: [226, 232, 228],
      },
      didDrawPage: () => {
        doc.setFontSize(8)
        doc.setTextColor(104, 117, 109)
        doc.text('ACS Controle Saúde', 14, altura - 8)
        doc.text(`Página ${doc.getNumberOfPages()}`, largura - 14, altura - 8, { align: 'right' })
      },
    })
    doc.save(`acs-${tipoRelatorio}-${isoHoje}.pdf`)
  }

  function exportarExcel() {
    const linhas = relatorioDados.linhas
      .map(
        (linha) => `
          <tr>
            ${linha.map((celula) => `<td>${escaparCelula(celula)}</td>`).join('')}
          </tr>`,
      )
      .join('')
    const cabecalho = relatorioDados.colunas.map((coluna) => `<th>${escaparCelula(coluna)}</th>`).join('')
    const tabela = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body>
          <h1>${escaparCelula(relatorioDados.titulo)}</h1>
          <p>${escaparCelula(configuracoes.unidadeSaude)} - ${escaparCelula(configuracoes.microarea)}</p>
          <table>
            <thead><tr>${cabecalho}</tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        </body>
      </html>`
    baixarArquivo(`acs-${tipoRelatorio}-${isoHoje}.xls`, tabela, 'application/vnd.ms-excel;charset=utf-8')
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
          <h1>{modoAuth === 'cadastro' ? 'Criar conta' : modoAuth === 'recuperar' ? 'Recuperar senha' : 'Bem-vindo'}</h1>
          <p className="login-copy">
            {modoAuth === 'cadastro'
              ? 'Cadastre seu acesso para sincronizar os dados da microárea.'
              : modoAuth === 'recuperar'
                ? 'Informe seu e-mail para receber o link de recuperação.'
                : 'Gerencie visitas e indicadores com facilidade.'}
          </p>
          <form onSubmit={entrar} className="form-grid">
            <label>
              E-mail
              <input name="usuario" autoComplete="email" placeholder="drica@admin.com" type="email" required />
            </label>
            {modoAuth !== 'recuperar' && (
              <label>
                Senha
                <input name="senha" type="password" autoComplete={modoAuth === 'cadastro' ? 'new-password' : 'current-password'} placeholder="********" minLength={6} required />
              </label>
            )}
            {erroLogin && <p className="form-error">{erroLogin}</p>}
            {mensagemLogin && <p className="form-success">{mensagemLogin}</p>}
            <button className="primary-button" type="submit" disabled={carregando}>
              {carregando ? 'Aguarde...' : modoAuth === 'cadastro' ? 'Criar conta' : modoAuth === 'recuperar' ? 'Enviar link' : 'Entrar'}
            </button>
            <div className="login-mode-actions">
              {modoAuth !== 'entrar' && (
                <button type="button" onClick={() => alterarModoAuth('entrar')}>
                  Entrar
                </button>
              )}
              {modoAuth !== 'cadastro' && (
                <button type="button" onClick={() => alterarModoAuth('cadastro')}>
                  Criar conta
                </button>
              )}
              {modoAuth !== 'recuperar' && (
                <button type="button" onClick={() => alterarModoAuth('recuperar')}>
                  Esqueci a senha
                </button>
              )}
            </div>
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
              <strong>ACS Saúde</strong>
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
                <h2>Início</h2>
              </div>
            </div>
            <div className="quick-filters">
              {['Hoje', 'Semana', 'Mês', 'Pendências', 'Prioridades'].map((item) => (
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
              <ListaFamilias familias={familiasDashboard} titulo={fraseQuantidade(familiasDashboard.length, 'família no filtro', 'famílias no filtro')} prazoVisitaDias={configuracoes.diasParaVisitaAtrasada} />
              <ListaMoradores moradores={moradoresDashboard} titulo="Busca rápida" />
            </div>
          </section>
        )}

        {tela === 'logradouros' && (
          <section className="screen two-column animate-in">
            <CrudCard title="Cadastrar logradouro">
              <form className="form-grid" onSubmit={adicionarLogradouro}>
                <label>
                  Área ou bairro
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
                  Quantidade de imóveis
                  <input name="quantidadeImoveis" type="number" min="0" placeholder="Ex.: 16" defaultValue={logradouroEditando?.quantidadeImoveis ?? ''} required />
                </label>
                <label>
                  Observações do logradouro
                  <textarea name="observacoes" placeholder="Referência, trecho, ponto conhecido..." defaultValue={logradouroEditando?.observacoes ?? ''} />
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
                        <small>{item.bairro} - {item.quantidadeImoveis} imóveis</small>
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
            <CrudCard title={familiaEditando ? 'Editar Família' : 'Nova Família'}>
              <form className="form-grid" onSubmit={adicionarFamilia} key={familiaEditando?.id ?? 'nova-familia'}>
                <label>
                  Logradouro
                  <select name="logradouroId" defaultValue={familiaEditando?.logradouroId ?? ''} required>
                    <option value="" disabled>Selecione um logradouro</option>
                    {logradouros.map((item) => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Número da casa
                  <input name="numero" placeholder="Ex.: 123" defaultValue={familiaEditando?.numero ?? ''} required />
                </label>
                <label>
                  Nome da família
                  <input name="nome" placeholder="Ex.: Família Souza" defaultValue={familiaEditando?.nome ?? ''} required />
                </label>
                <label>
                  Tipo do imóvel
                  <select name="tipoImovel" defaultValue={familiaEditando?.tipoImovel ?? 'Casa'}>
                    <option>Casa</option>
                    <option>Apartamento</option>
                    <option>Comércio</option>
                    <option>Outro</option>
                  </select>
                </label>
                <label>
                  Responsável familiar
                  <input name="responsavel" placeholder="Nome do responsável" defaultValue={familiaEditando?.responsavel ?? ''} required />
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
                  Situação da moradia
                  <input name="situacaoMoradia" placeholder="Própria, alugada, cedida..." defaultValue={familiaEditando?.situacaoMoradia ?? ''} />
                </label>
                <label>
                  Data da última visita
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
                  Observações do domicílio
                  <textarea name="observacoes" placeholder="Informações importantes sobre a família ou moradia" defaultValue={familiaEditando?.observacoes ?? ''} />
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
                  <input name="cns" inputMode="numeric" maxLength={15} placeholder="Cartão Nacional de Saúde" defaultValue={moradorEditando?.cns ?? ''} />
                </label>
                <label>
                  NIS
                  <input name="nis" inputMode="numeric" maxLength={14} placeholder="Número de Identificação Social" defaultValue={moradorEditando?.nis ?? ''} />
                </label>
                <label>
                  Data de nascimento
                  <input name="nascimento" type="date" defaultValue={moradorEditando?.nascimento ?? ''} required />
                </label>
                <label>
                  Sexo
                  <select name="sexo" defaultValue={moradorEditando?.sexo ?? 'Feminino'}>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
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
                  Família/domicílio vinculado
                  <select name="familiaId" defaultValue={moradorEditando?.familiaId ?? ''} required>
                    <option value="" disabled>Selecione uma família</option>
                    {familias.map((item) => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                  </select>
                </label>
                <CheckGrid
                  items={[
                    ['hipertenso', 'Hipertenso'],
                    ['diabetico', 'Diabético'],
                    ['gestante', 'Gestante'],
                    ['preNatalEmDia', 'Pré-natal em dia'],
                    ['bolsaFamilia', 'Bolsa Família'],
                    ['responsavelFamiliar', 'Responsável familiar'],
                    ['remedioControlado', 'Remédio controlado'],
                    ['vacinaEmDia', 'Vacina em dia'],
                  ]}
                  values={moradorEditando ?? undefined}
                />
                <label>
                  Medicamento controlado
                  <input name="medicamento" placeholder="Nome do medicamento, se houver" defaultValue={moradorEditando?.medicamento ?? ''} />
                </label>
                <label>
                  Observações gerais
                  <textarea name="observacoes" placeholder="Informações importantes para acompanhamento" defaultValue={moradorEditando?.observacoes ?? ''} />
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
          <section className="screen visits-screen animate-in">
            <CrudCard title={visitaEditando ? 'Editar Visita' : 'Registrar Visita'}>
              <form className="form-grid" onSubmit={registrarVisita} key={visitaEditando?.id ?? 'nova-visita'}>
                <label>
                  Família visitada
                  <select name="familiaId" defaultValue={visitaEditando?.familiaId ?? ''} required>
                    <option value="" disabled>Selecione uma família</option>
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
                  ACS responsável
                  <input name="acs" placeholder="Nome da ACS" defaultValue={visitaEditando?.acs ?? 'Adriellen Guimarães'} />
                </label>
                <label>
                  Pessoas encontradas
                  <input
                    name="pessoasEncontradas"
                    placeholder="Quem estava na residência"
                    defaultValue={visitaEditando?.pessoasEncontradas ?? ''}
                  />
                </label>
                <label>
                  Condições acompanhadas
                  <input name="condicoes" placeholder="Hipertensão, gestante, criança, idoso..." defaultValue={visitaEditando?.condicoes ?? ''} />
                </label>
                <label>
                  Próxima visita recomendada
                  <input name="proximaVisita" type="date" defaultValue={visitaEditando?.proximaVisita ?? ''} />
                </label>
                <CheckGrid
                  items={[
                    ['vacinaAtualizada', 'Vacina atualizada'],
                    ['preNatalAtualizado', 'Pré-natal atualizado'],
                    ['medicamentoConfirmado', 'Medicamento confirmado'],
                  ]}
                  values={visitaEditando ?? undefined}
                />
                <label>
                  Observações da visita
                  <textarea
                    name="observacoes"
                    placeholder="Orientações, pendências e encaminhamentos"
                    defaultValue={visitaEditando?.observacoes ?? ''}
                  />
                </label>
                <label>
                  Status da visita
                  <select name="status" defaultValue={visitaEditando?.status ?? 'concluida'}>
                    <option value="concluida">Concluída</option>
                    <option value="pendente">Pendente</option>
                    <option value="retorno_necessario">Retorno necessário</option>
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
              {gruposIndicadores.map((grupo) => (
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
            <div className="report-layout">
              <section className="panel report-controls">
                <div className="panel-title-row">
                  <h2>Gerar relatório</h2>
                  <span>{relatorioDados.linhas.length}</span>
                </div>
                <div className="form-grid">
                  <label>
                    Tipo
                    <select value={tipoRelatorio} onChange={(event) => setTipoRelatorio(event.target.value as TipoRelatorio)}>
                      <option value="indicadores">Indicadores por grupo</option>
                      <option value="familias">Famílias e domicílios</option>
                      <option value="visitas">Visitas domiciliares</option>
                      <option value="vacinas">Vacinas</option>
                    </select>
                  </label>
                  {tipoRelatorio === 'indicadores' && (
                    <label>
                      Grupo
                      <select value={grupoRelatorio} onChange={(event) => setGrupoRelatorio(event.target.value)}>
                        {gruposIndicadores.map((grupo) => (
                          <option key={grupo}>{grupo}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Logradouro
                    <select value={relatorioLogradouro} onChange={(event) => setRelatorioLogradouro(event.target.value)}>
                      <option value="">Todos</option>
                      {logradouros.map((logradouro) => (
                        <option key={logradouro.id} value={logradouro.id}>{logradouro.tipo} {logradouro.nome}</option>
                      ))}
                    </select>
                  </label>
                  {(tipoRelatorio === 'visitas' || tipoRelatorio === 'vacinas') && (
                    <>
                      <label>
                        Início
                        <input type="date" value={relatorioInicio} onChange={(event) => setRelatorioInicio(event.target.value)} />
                      </label>
                      <label>
                        Fim
                        <input type="date" value={relatorioFim} onChange={(event) => setRelatorioFim(event.target.value)} />
                      </label>
                    </>
                  )}
                  {tipoRelatorio !== 'indicadores' && (
                    <label>
                      Status
                      <select value={relatorioStatus} onChange={(event) => setRelatorioStatus(event.target.value)}>
                        <option value="">Todos</option>
                        {tipoRelatorio === 'familias' && (
                          <>
                            <option value="em_dia">Em dia</option>
                            <option value="pendente">Pendente</option>
                            <option value="atrasada">Atrasada</option>
                          </>
                        )}
                        {tipoRelatorio === 'visitas' && (
                          <>
                            <option value="concluida">Concluída</option>
                            <option value="pendente">Pendente</option>
                            <option value="retorno_necessario">Retorno necessário</option>
                          </>
                        )}
                        {tipoRelatorio === 'vacinas' && (
                          <>
                            <option value="aplicada">Aplicada</option>
                            <option value="pendente">Pendente</option>
                            <option value="atrasada">Atrasada</option>
                          </>
                        )}
                      </select>
                    </label>
                  )}
                </div>
                <div className="action-row">
                  <button className="secondary-button" onClick={exportarPDF}><Download size={17} /> PDF bonito</button>
                  <button className="secondary-button" onClick={exportarExcel}><FileSpreadsheet size={17} /> Excel</button>
                </div>
              </section>

              <section className="report-summary">
                {[
                  { label: 'Famílias', valor: familias.length, icon: Home },
                  { label: 'Moradores', valor: moradores.length, icon: UsersRound },
                  { label: 'Visitas', valor: visitas.length, icon: CalendarCheck },
                  { label: 'No relatório', valor: relatorioDados.linhas.length, icon: ClipboardList },
                ].map(({ label, valor, icon: SummaryIcon }) => {
                  return (
                    <article key={label} className="summary-card">
                      <SummaryIcon size={19} />
                      <strong>{valor}</strong>
                      <span>{label}</span>
                    </article>
                  )
                })}
              </section>

              <section className="panel report-preview">
                <div className="panel-title-row">
                  <h2>{relatorioDados.titulo}</h2>
                  <span>{relatorioDados.linhas.length}</span>
                </div>
                <p className="muted">{relatorioDados.subtitulo}</p>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        {relatorioDados.colunas.map((coluna) => <th key={coluna}>{coluna}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioDados.linhas.length === 0 && (
                        <tr>
                          <td colSpan={relatorioDados.colunas.length}>Nenhum registro encontrado.</td>
                        </tr>
                      )}
                      {relatorioDados.linhas.slice(0, 80).map((linha, index) => (
                        <tr key={`${linha.join('-')}-${index}`}>
                          {linha.map((celula, celulaIndex) => <td key={`${celula}-${celulaIndex}`}>{celula}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </section>
        )}

        {tela === 'configuracoes' && (
          <section className="screen two-column animate-in">
            <CrudCard title="Configurações">
              <form className="form-grid" onSubmit={salvarConfiguracoes} key={`${configuracoes.unidadeSaude}-${configuracoes.microarea}`}>
                <label>
                  Unidade de saúde
                  <input name="unidadeSaude" defaultValue={configuracoes.unidadeSaude} placeholder="Ex.: UBS Posto da Feira" required />
                </label>
                <label>
                  Microárea
                  <input name="microarea" defaultValue={configuracoes.microarea} placeholder="Ex.: Microárea 04" required />
                </label>
                <label>
                  Dias para visita atrasada
                  <input name="diasParaVisitaAtrasada" type="number" min="1" defaultValue={configuracoes.diasParaVisitaAtrasada} required />
                </label>
                <label className="check-item inline-check">
                  <input name="backupAutomatico" type="checkbox" defaultChecked={configuracoes.backupAutomatico} />
                  <span>Marcar backup automático como ativo</span>
                </label>
                {configuracoesSalvas && <p className="form-success">{configuracoesSalvas}</p>}
                <button className="primary-button"><Save size={17} /> Salvar configurações</button>
              </form>
            </CrudCard>
            <CrudCard title="Ambiente">
              <div className="settings-list">
                <p>
                  <strong>Banco de dados</strong>
                  <span>{supabaseConfigurado ? 'Supabase conectado' : 'Modo demonstração local'}</span>
                </p>
                <p>
                  <strong>Login demo</strong>
                  <span>{loginDemoPermitido ? 'Permitido apenas no desenvolvimento' : 'Bloqueado neste ambiente'}</span>
                </p>
                <p>
                  <strong>Ciclo de visita</strong>
                  <span>{configuracoes.diasParaVisitaAtrasada} dias</span>
                </p>
                <p>
                  <strong>Registros locais</strong>
                  <span>{logradouros.length} logradouros, {familias.length} famílias, {moradores.length} moradores, {visitas.length} visitas</span>
                </p>
              </div>
            </CrudCard>
            <CrudCard title="Segurança">
              <form className="form-grid" onSubmit={alterarSenha}>
                <label>
                  Nova senha
                  <input type="password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} minLength={6} placeholder="Mínimo 6 caracteres" />
                </label>
                <label>
                  Confirmar senha
                  <input type="password" value={confirmarSenha} onChange={(event) => setConfirmarSenha(event.target.value)} minLength={6} placeholder="Repita a nova senha" />
                </label>
                <button className="primary-button"><ShieldCheck size={17} /> Atualizar senha</button>
              </form>
            </CrudCard>
            <CrudCard title="Backup e manutenção">
              <div className="settings-actions">
                <button className="secondary-button" type="button" onClick={exportarBackup}><Database size={17} /> Baixar backup JSON</button>
                <button className="secondary-button danger-soft" type="button" onClick={limparDadosLocais}><RotateCcw size={17} /> Restaurar demo local</button>
              </div>
              <p className="muted">O backup JSON baixa uma cópia dos dados carregados neste navegador. A restauração local não apaga dados do Supabase.</p>
              {mensagemConfiguracoes && <p className="form-success">{mensagemConfiguracoes}</p>}
            </CrudCard>
          </section>
        )}

        <nav className="mobile-bottom-nav">
          {[
            { id: 'dashboard' as Tela, label: 'Início', icon: Activity },
            { id: 'familias' as Tela, label: 'Famílias', icon: Home },
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
              <input name="dose" placeholder="Ex.: 1ª dose, reforço, anual" defaultValue={registroEditando?.dose ?? ''} required />
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
              Observações
              <textarea name="observacoes" placeholder="Lote, UBS, orientação ou motivo da pendência" defaultValue={registroEditando?.observacoes ?? ''} />
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
              <small>{pendentes.length ? `${pendentes.length} pendência(s) para conferir` : 'Sem pendência detalhada registrada'}</small>
            </div>
          )}

          <div className="vaccine-list">
            <h3>Calendário sugerido</h3>
            {sugestoes.length === 0 && <p className="empty-state">Sem sugestões para este perfil.</p>}
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
            <span>CPF: {morador.cpf || 'Não informado'} - {morador.idade} anos</span>
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
  const [prazoFiltro, setPrazoFiltro] = useState('')

  const visitasComPrazo = visitas.map((visita) => {
    const dataProxima = visita.proximaVisita || adicionarDias(visita.data, PRAZO_VISITA_DIAS)
    const prazo = statusProximaVisita(dataProxima)
    return {
      ...visita,
      dataProxima,
      prazo,
      textoPrazo: `${prazo.titulo} - ${prazo.detalhe}`,
    }
  })

  const resumoPrazo = {
    atrasadas: visitasComPrazo.filter((visita) => visita.prazo.classe === 'atrasada').length,
    proximas: visitasComPrazo.filter((visita) => visita.prazo.classe === 'proxima').length,
    agendadas: visitasComPrazo.filter((visita) => visita.prazo.classe === 'em_dia').length,
  }

  const visitasFiltradas = visitasComPrazo.filter((visita) => {
    const termo = normalizarBusca(buscaHistorico.trim())
    const dentroDaBusca = !termo || [
      visita.familia,
      visita.endereco,
      visita.acs,
      visita.pessoasEncontradas,
      visita.condicoes,
      visita.observacoes,
      visita.textoPrazo,
      statusTexto(visita.status),
    ].some((valor) => correspondeBusca(valor, termo))
    const depoisDoInicio = !dataInicio || visita.data >= dataInicio
    const antesDoFim = !dataFim || visita.data <= dataFim
    const statusOk = !statusFiltro || visita.status === statusFiltro
    const prazoOk = !prazoFiltro || visita.prazo.classe === prazoFiltro
    return dentroDaBusca && depoisDoInicio && antesDoFim && statusOk && prazoOk
  }).sort((a, b) => a.dataProxima.localeCompare(b.dataProxima))

  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2>Visitas registradas</h2>
        <span>{visitasFiltradas.length}</span>
      </div>
      <div className="visit-deadline-summary">
        <article className="deadline-card atrasada">
          <strong>{resumoPrazo.atrasadas}</strong>
          <span>Atrasadas</span>
        </article>
        <article className="deadline-card proxima">
          <strong>{resumoPrazo.proximas}</strong>
          <span>Próximas ou hoje</span>
        </article>
        <article className="deadline-card em_dia">
          <strong>{resumoPrazo.agendadas}</strong>
          <span>Agendadas</span>
        </article>
      </div>
      <div className="visit-filters">
        <label>
          Buscar
          <input value={buscaHistorico} onChange={(event) => setBuscaHistorico(event.target.value)} placeholder="Família, ACS, condição..." />
        </label>
        <label>
          De
          <input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} />
        </label>
        <label>
          Até
          <input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} />
        </label>
        <label>
          Status
          <select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)}>
            <option value="">Todos</option>
            <option value="concluida">Concluída</option>
            <option value="pendente">Pendente</option>
            <option value="retorno_necessario">Retorno necessário</option>
          </select>
        </label>
        <label>
          Prazo
          <select value={prazoFiltro} onChange={(event) => setPrazoFiltro(event.target.value)}>
            <option value="">Todos</option>
            <option value="atrasada">Atrasadas</option>
            <option value="proxima">Próximas</option>
            <option value="em_dia">Agendadas</option>
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
                <small>{visita.endereco || 'Endereço não informado'}</small>
              </div>
              <div className="visit-card-actions">
                <span className={`status-pill deadline-status ${visita.prazo.classe}`}>{visita.prazo.titulo}</span>
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
              <div className={`next-visit-box ${visita.prazo.classe}`}>
                <CalendarCheck size={17} />
                <div>
                  <strong>{formatarData(visita.dataProxima)}</strong>
                  <span>{visita.textoPrazo}</span>
                </div>
              </div>
              <div className="visit-meta-grid">
                <span><strong>Realizada</strong>{formatarData(visita.data)}</span>
                <span><strong>ACS</strong>{visita.acs || 'Não informado'}</span>
                {visita.pessoasEncontradas && <span><strong>Pessoas</strong>{visita.pessoasEncontradas}</span>}
                {visita.condicoes && <span><strong>Condições</strong>{visita.condicoes}</span>}
              </div>
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
  return `Última visita: ${formatarData(data)} (${diasDesde(data)} dias)`
}

function textoPrazoVisita(data: string, prazoDias = PRAZO_VISITA_DIAS) {
  if (!data) return `Primeira visita pendente. Ciclo padrão: ${prazoDias} dias.`
  const dias = diasDesde(data)
  const proxima = adicionarDias(data, prazoDias)
  const saldo = prazoDias - dias
  if (saldo > 0) return `Próxima visita até ${formatarData(proxima)} (${saldo} dias restantes)`
  if (saldo === 0) return `Visita vence hoje (${formatarData(proxima)})`
  return `Visita atrasada há ${Math.abs(saldo)} dias. Passar novamente.`
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
          ['Pentavalente', '1ª dose', 2],
          ['VIP', '1ª dose', 2],
          ['Rotavírus', '1ª dose', 2],
          ['Pneumocócica', '1ª dose', 2],
          ['Meningocócica C', '1ª dose', 3],
          ['Pentavalente', '2ª dose', 4],
          ['VIP', '2ª dose', 4],
          ['Rotavírus', '2ª dose', 4],
          ['Pentavalente', '3ª dose', 6],
          ['VIP', '3ª dose', 6],
          ['Febre amarela', 'Dose inicial', 9],
          ['Tríplice viral', '1ª dose', 12],
          ['Pneumocócica', 'Reforço', 12],
          ['Meningocócica C', 'Reforço', 12],
          ['DTP', '1º reforço', 15],
          ['Tríplice viral', '2ª dose', 15],
          ['DTP', '2º reforço', 48],
        ]
      : [
          ['Influenza', `Anual ${hoje.getFullYear()}`, 0],
          ['COVID-19', 'Conferir reforço', 0],
          ['dT', 'Conferir reforço 10 anos', 0],
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
  if (morador.gestante && !morador.preNatalEmDia) pendencias.push('Pré-natal pendente')
  if (morador.vacinaPendente || !morador.vacinaEmDia) pendencias.push('Vacina pendente')
  if (morador.hipertenso) pendencias.push('Hipertensão')
  return pendencias.slice(0, 1).join('') || 'Em dia'
}

export default App
