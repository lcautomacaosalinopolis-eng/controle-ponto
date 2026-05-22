import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [empresas, setEmpresas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [pontos, setPontos] = useState([])
  const [usuarioLogado, setUsuarioLogado] = useState(null)
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [novaEmpresa, setNovaEmpresa] = useState('')
  const [emailMasterEmpresa, setEmailMasterEmpresa] = useState('')
  const [senhaMasterEmpresa, setSenhaMasterEmpresa] = useState('')
  const [registrandoPonto, setRegistrandoPonto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
const [novoFazAlmoco, setNovoFazAlmoco] = useState(true)
const [salvarLogin, setSalvarLogin] = useState(false)
const [funcionarioEditando, setFuncionarioEditando] = useState(null)

const [editNome, setEditNome] = useState('')

const [editEmail, setEditEmail] = useState('')

const [editSenha, setEditSenha] = useState('')
const [editFazAlmoco, setEditFazAlmoco] = useState(true)
const [mostrarFuncionarios, setMostrarFuncionarios] = useState(false)
const [buscaFuncionario, setBuscaFuncionario] = useState('')
const [mostrarHistoricoDia, setMostrarHistoricoDia] = useState(false)
const [mostrarRelatorioMensal, setMostrarRelatorioMensal] = useState(false)
  const [dataRelatorio, setDataRelatorio] = useState(formatarDataISO(new Date()))
  const [mesRelatorioMensal, setMesRelatorioMensal] = useState(formatarMesISO(new Date()))
  const [funcionarioRelatorioMensal, setFuncionarioRelatorioMensal] = useState('todos')
  const [horaInicioRelatorioMensal, setHoraInicioRelatorioMensal] = useState('')
  const [horaFimRelatorioMensal, setHoraFimRelatorioMensal] = useState('')

  async function carregarEmpresas() {
    const { data } = await supabase.from('empresas').select('*').order('id')
    if (data) setEmpresas(data)
  }

  async function carregarUsuarios() {
    const { data } = await supabase.from('usuarios').select('*').order('id')
    if (data) setUsuarios(data)
  }

  async function carregarPontos() {
    const { data } = await supabase.from('pontos').select('*').order('id', { ascending: false })
    if (data) setPontos(data)
  }

  useEffect(() => {
    carregarEmpresas()
    carregarUsuarios()
    carregarPontos()

    const canal = supabase
      .channel('tempo-real')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pontos' }, async () => carregarPontos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, async () => carregarUsuarios())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresas' }, async () => carregarEmpresas())
      .subscribe()

return () => {
  supabase.removeChannel(canal)
}
  }, [])
useEffect(() => {

  const loginSalvo = localStorage.getItem(
    'loginSalvo'
  )

  if (loginSalvo) {

    const dados = JSON.parse(loginSalvo)

    setEmail(dados.email || '')
    setSenha(dados.senha || '')

    setSalvarLogin(true)
  }

}, [])
  function mostrarMensagem(texto) {
    setMensagem(texto)
    setTimeout(() => setMensagem(''), 4000)
  }

  function formatarDataISO(dataHora) {
    const data = new Date(dataHora)

    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(data)

    const ano = partes.find((parte) => parte.type === 'year')?.value
    const mes = partes.find((parte) => parte.type === 'month')?.value
    const dia = partes.find((parte) => parte.type === 'day')?.value

    return `${ano}-${mes}-${dia}`
  }

  function formatarMesISO(dataHora) {
    const dataISO = formatarDataISO(dataHora)
    return dataISO.slice(0, 7)
  }

  function formatarDataBR(dataHora) {
    return new Date(dataHora).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    })
  }

  function formatarHoraBR(dataHora) {
    return new Date(dataHora).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  async function tentarBuscarHorario(url, extrairData) {
    const resposta = await fetch(url, { cache: 'no-store' })

    if (!resposta.ok) {
      throw new Error('Falha ao consultar horário.')
    }

    const dados = await resposta.json()
    const dataExtraida = extrairData(dados)
    const data = new Date(dataExtraida)

    if (!dataExtraida || Number.isNaN(data.getTime())) {
      throw new Error('Horário inválido.')
    }

    return data
  }

  async function obterHorarioOficial() {
    const consultas = [
      () => tentarBuscarHorario(
        'https://worldtimeapi.org/api/timezone/America/Sao_Paulo',
        (dados) => dados.datetime
      ),
      () => tentarBuscarHorario(
        'https://timeapi.io/api/TimeZone/zone?timeZone=America/Sao_Paulo',
        (dados) => dados.currentLocalTime
      ),
    ]

    for (const consulta of consultas) {
      try {
        return await consulta()
      } catch (erro) {
      }
    }

    throw new Error('Não foi possível consultar o horário oficial da internet.')
  }

  function hojeISO() {
    return formatarDataISO(new Date())
  }

  function hojeBR() {
    return formatarDataBR(new Date())
  }

  function horaAtual() {
    return formatarHoraBR(new Date())
  }

  function formatarHoraServidor(dataHora, fallback) {
    if (!dataHora) return fallback || '-'

    return new Date(dataHora).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  async function login() {
    if (email.trim().toLowerCase() === 'programador@lc.com' && senha === '@Lc135910#') {
      setUsuarioLogado({
        nome: 'PROGRAMADOR',
        tipo: 'programador',
        email: 'programador@lc.com',
        empresa_id: null,
      })
if (salvarLogin) {

  localStorage.setItem(
    'loginSalvo',
    JSON.stringify({
      email,
      senha,
    })
  )

} else {

  localStorage.removeItem(
    'loginSalvo'
  )

}
      setEmail('')
      setSenha('')
      mostrarMensagem('Login PROGRAMADOR realizado com sucesso.')
      return
    }

    const empresaMaster = empresas.find(
      (empresa) =>
        empresa.email_master?.toLowerCase() === email.trim().toLowerCase() &&
        empresa.senha_master === senha &&
        empresa.ativo !== false
    )

    if (empresaMaster) {
      setUsuarioLogado({
        nome: 'MASTER',
        tipo: 'master',
        email,
        empresa_id: empresaMaster.id,
        empresa_nome: empresaMaster.nome,
      })
      setEmpresaSelecionada(empresaMaster.id)
      setEmail('')
      setSenha('')
      mostrarMensagem('Login MASTER realizado com sucesso.')
      return
    }

    const usuario = usuarios.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase() && u.senha === senha
    )

    if (!usuario) {
      mostrarMensagem('Usuário não encontrado.')
      return
    }

    if (usuario.ativo === false) {
      mostrarMensagem('Usuário bloqueado.')
      return
    }

    setUsuarioLogado(usuario)
    setEmpresaSelecionada(usuario.empresa_id)
    setEmail('')
    setSenha('')
    mostrarMensagem('Login realizado com sucesso.')
  }

 function sair() {

  setUsuarioLogado(null)

  setEmpresaSelecionada(null)

  const loginSalvo = localStorage.getItem(
    'loginSalvo'
  )

  if (loginSalvo) {

    const dados = JSON.parse(loginSalvo)

    setEmail(dados.email || '')

    setSenha(dados.senha || '')

    setSalvarLogin(true)

  }

}

  async function criarEmpresa() {
    if (!novaEmpresa || !emailMasterEmpresa || !senhaMasterEmpresa) {
      mostrarMensagem('Preencha nome da empresa, e-mail master e senha master.')
      return
    }

    const { error } = await supabase.from('empresas').insert([
      {
        nome: novaEmpresa,
        email_master: emailMasterEmpresa.toLowerCase(),
        senha_master: senhaMasterEmpresa,
        ativo: true,
      },
    ])

    if (error) {
      mostrarMensagem('Erro ao criar empresa.')
      return
    }

    setNovaEmpresa('')
    setEmailMasterEmpresa('')
    setSenhaMasterEmpresa('')
    await carregarEmpresas()
    mostrarMensagem('Empresa criada com sucesso!')
  }

  async function cadastrarFuncionario() {
    if (!novoNome || !novoEmail || !novaSenha) {
      mostrarMensagem('Preencha todos os campos.')
      return
    }

    const empresaId = usuarioLogado.tipo === 'programador' ? empresaSelecionada : usuarioLogado.empresa_id

    if (!empresaId) {
      mostrarMensagem('Selecione uma empresa antes de cadastrar funcionário.')
      return
    }

    const { error } = await supabase.from('usuarios').insert([
      {
        nome: novoNome,
        email: novoEmail.toLowerCase(),
        senha: novaSenha,
        faz_almoco: novoFazAlmoco,
        tipo: 'funcionario',
        empresa_id: empresaId,
        ativo: true,
      },
    ])

    if (error) {
      mostrarMensagem('Erro ao cadastrar funcionário.')
      return
    }

    setNovoNome('')
    setNovoEmail('')
    setNovaSenha('')
setNovoFazAlmoco(true)
    await carregarUsuarios()
    mostrarMensagem('Funcionário cadastrado com sucesso!')
  }

  async function excluirFuncionario(id) {
    const confirmar = confirm('Deseja realmente excluir este funcionário?')
    if (!confirmar) return

    await supabase.from('usuarios').delete().eq('id', id)
    await carregarUsuarios()
    mostrarMensagem('Funcionário excluído.')
  }

 async function registrarPonto() {

  if (registrandoPonto) return

  setRegistrandoPonto(true)

  let horarioOficial

  try {
    horarioOficial = await obterHorarioOficial()
  } catch (erro) {
    mostrarMensagem('Não foi possível consultar o horário oficial da internet. Verifique a conexão e tente novamente.')
    setRegistrandoPonto(false)
    return
  }

  const dataOficialISO = formatarDataISO(horarioOficial)
  const dataOficialBR = formatarDataBR(horarioOficial)
  const horaOficialBR = formatarHoraBR(horarioOficial)

  const registrosHoje = pontos.filter(
    (p) =>
      p.usuario_id === usuarioLogado.id &&
      p.data_iso === dataOficialISO
  )

  const entrada = registrosHoje.find((p) => p.tipo === 'Entrada')
  const saidaAlmoco = registrosHoje.find((p) => p.tipo === 'Saída Almoço')
  const voltaAlmoco = registrosHoje.find((p) => p.tipo === 'Volta Almoço')
  const saida = registrosHoje.find((p) => p.tipo === 'Saída')

  let tipo = ''

  if (usuarioLogado.faz_almoco) {

    if (!entrada) {
      tipo = 'Entrada'
    }

    else if (!saidaAlmoco) {
      tipo = 'Saída Almoço'
    }

    else if (!voltaAlmoco) {
      tipo = 'Volta Almoço'
    }

    else if (!saida) {
      tipo = 'Saída'
    }

    else {
      mostrarMensagem('Você já registrou todos os pontos de hoje.')
      setRegistrandoPonto(false)
      return
    }

  } else {

    if (!entrada) {
      tipo = 'Entrada'
    }

    else if (!saida) {
      tipo = 'Saída'
    }

    else {
      mostrarMensagem('Você já registrou entrada e saída hoje.')
      setRegistrandoPonto(false)
      return
    }

  }

  const { error } = await supabase.from('pontos').insert([
    {
      usuario_id: usuarioLogado.id,
      empresa_id: usuarioLogado.empresa_id,
      nome: usuarioLogado.nome,
      data: dataOficialBR,
      data_iso: dataOficialISO,
      hora: horaOficialBR,
      tipo,
    },
  ])

  if (error) {
    mostrarMensagem('Erro ao registrar ponto.')
    setRegistrandoPonto(false)
    return
  }
    await carregarPontos()
    setRegistrandoPonto(false)
    mostrarMensagem(`✅ ${tipo} registrada com horário oficial!`)
  }

  function empresasVisiveis() {
    if (usuarioLogado?.tipo === 'programador') return empresas
    return empresas.filter((empresa) => empresa.id === usuarioLogado?.empresa_id)
  }

  function usuariosVisiveis() {
    if (usuarioLogado?.tipo === 'programador') {
      if (!empresaSelecionada) return []
      return usuarios.filter((usuario) => usuario.empresa_id === empresaSelecionada)
    }

    return usuarios.filter((usuario) => usuario.empresa_id === usuarioLogado?.empresa_id)
  }

 function gerarRelatorio(empresaId = usuarioLogado?.empresa_id) {
  const idEmpresa = empresaId || empresaSelecionada || usuarioLogado?.empresa_id

  const registros = pontos.filter((p) => {
    if (!idEmpresa) return false
    return p.data_iso === dataRelatorio && p.empresa_id === idEmpresa
  })

  const agrupado = {}

  registros.forEach((r) => {
    const chaveFuncionario = String(r.usuario_id || r.nome)

    if (!agrupado[chaveFuncionario]) {
      agrupado[chaveFuncionario] = {
        nome: r.nome,
        entrada: '',
        saidaAlmoco: '',
        voltaAlmoco: '',
        saida: '',
        data: r.data,
      }
    }

    if (r.tipo === 'Entrada') {
      agrupado[chaveFuncionario].entrada = formatarHoraServidor(r.registrado_em, r.hora)
    }

    if (r.tipo === 'Saída Almoço') {
      agrupado[chaveFuncionario].saidaAlmoco = formatarHoraServidor(r.registrado_em, r.hora)
    }

    if (r.tipo === 'Volta Almoço') {
      agrupado[chaveFuncionario].voltaAlmoco = formatarHoraServidor(r.registrado_em, r.hora)
    }

    if (r.tipo === 'Saída') {
      agrupado[chaveFuncionario].saida = formatarHoraServidor(r.registrado_em, r.hora)
    }
  })

  return Object.keys(agrupado).map((chaveFuncionario) => ({
    nome: agrupado[chaveFuncionario].nome,
    data: agrupado[chaveFuncionario].data,
    entrada: agrupado[chaveFuncionario].entrada,
    saidaAlmoco: agrupado[chaveFuncionario].saidaAlmoco,
    voltaAlmoco: agrupado[chaveFuncionario].voltaAlmoco,
    saida: agrupado[chaveFuncionario].saida,
    status:
      agrupado[chaveFuncionario].entrada && agrupado[chaveFuncionario].saida
        ? 'Completo'
        : 'Pendente',
  }))
}

function gerarHistoricoDia(empresaId = usuarioLogado?.empresa_id) {
  const idEmpresa = empresaId || empresaSelecionada || usuarioLogado?.empresa_id

  if (!idEmpresa || !dataRelatorio) return []

  return pontos
    .filter((p) => p.empresa_id === idEmpresa && p.data_iso === dataRelatorio)
    .map((p) => ({
      id: p.id,
      usuario_id: p.usuario_id,
      nome: p.nome,
      data: p.data,
      data_iso: p.data_iso,
      tipo: p.tipo,
      hora: formatarHoraServidor(p.registrado_em, p.hora),
    }))
    .sort((a, b) => {
      const horaComparacao = (a.hora || '').localeCompare(b.hora || '')
      if (horaComparacao !== 0) return horaComparacao

      return (a.nome || '').localeCompare(b.nome || '')
    })
}

function horaParaMinutos(hora) {
  if (!hora || hora === '-') return null

  const partes = hora.split(':')

  if (partes.length < 2) return null

  return Number(partes[0]) * 60 + Number(partes[1])
}

function gerarRelatorioMensal(empresaId = usuarioLogado?.empresa_id) {
  const idEmpresa = empresaId || empresaSelecionada || usuarioLogado?.empresa_id

  if (!idEmpresa || !mesRelatorioMensal) return []

  const inicioFiltro = horaInicioRelatorioMensal ? horaParaMinutos(horaInicioRelatorioMensal) : null
  const fimFiltro = horaFimRelatorioMensal ? horaParaMinutos(horaFimRelatorioMensal) : null

  return pontos
    .filter((p) => {
      if (p.empresa_id !== idEmpresa) return false
      if (!p.data_iso?.startsWith(mesRelatorioMensal)) return false

      if (
        funcionarioRelatorioMensal !== 'todos' &&
        String(p.usuario_id) !== String(funcionarioRelatorioMensal)
      ) {
        return false
      }

      const horaRegistro = formatarHoraServidor(p.registrado_em, p.hora)
      const minutosRegistro = horaParaMinutos(horaRegistro)

      if (inicioFiltro !== null && minutosRegistro !== null && minutosRegistro < inicioFiltro) return false
      if (fimFiltro !== null && minutosRegistro !== null && minutosRegistro > fimFiltro) return false

      return true
    })
    .map((p) => ({
      id: p.id,
      usuario_id: p.usuario_id,
      nome: p.nome,
      data: p.data,
      data_iso: p.data_iso,
      tipo: p.tipo,
      hora: formatarHoraServidor(p.registrado_em, p.hora),
    }))
    .sort((a, b) => {
      const dataComparacao = (a.data_iso || '').localeCompare(b.data_iso || '')
      if (dataComparacao !== 0) return dataComparacao

      return (a.hora || '').localeCompare(b.hora || '')
    })
}
 function exportarRelatorioPDF() {

  const idEmpresaPDF = empresaSelecionada || usuarioLogado?.empresa_id

  const empresaAtual = empresas.find(
    (empresa) => empresa.id === idEmpresaPDF
  )

  const registros = gerarRelatorio(idEmpresaPDF)

  const janela = window.open(
    '',
    '',
    'width=900,height=700'
  )

  let html = `
    <html>

      <head>

        <title>
          Relatório de Ponto
        </title>

        <style>

          body{
            font-family:Arial;
            padding:30px;
          }

          h1,h2{
            text-align:center;
            color:#001f6b;
          }

          table{
            width:100%;
            border-collapse:collapse;
            margin-top:25px;
          }

          th,td{
            border:1px solid #999;
            padding:10px;
            text-align:center;
          }

          th{
            background:#001f6b;
            color:white;
          }

          .rodape{
            margin-top:40px;
            text-align:center;
            font-size:12px;
            letter-spacing:2px;
            color:#666;
          }

        </style>

      </head>

      <body>

        <h1>
          Relatório de Ponto
        </h1>

        <h2>
          ${empresaAtual ? empresaAtual.nome : ''}
        </h2>

        <table>

          <tr>
            <th>Funcionário</th>
            <th>Data</th>
            <th>Entrada</th>
            <th>Saída almoço</th>
            <th>Volta almoço</th>
            <th>Saída casa</th>
            <th>Status</th>
          </tr>
  `

  registros.forEach((r) => {

    html += `
      <tr>
        <td>${r.nome}</td>
        <td>${r.data}</td>
        <td>${r.entrada || '-'}</td>
        <td>${r.saidaAlmoco || '-'}</td>
        <td>${r.voltaAlmoco || '-'}</td>
        <td>${r.saida || '-'}</td>
        <td>${r.status}</td>
      </tr>
    `
  })

  html += `

        </table>

        <div class="rodape">
          DEVELOPED BY DINHO OLIVEIRA
        </div>

      </body>

    </html>
  `

  janela.document.write(html)

  janela.document.close()

  janela.focus()

  setTimeout(() => {
    janela.print()
  }, 500)

}

  const containerStyle = {
    maxWidth: usuarioLogado ? '1120px' : '440px',
    margin: usuarioLogado ? '18px auto' : '26px auto',
    backgroundColor: '#ffffff',
    padding: usuarioLogado ? '0' : '34px 24px',
    borderRadius: usuarioLogado ? '28px' : '30px',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.16)',
    textAlign: 'center',
    overflow: 'hidden',
    border: '1px solid rgba(219, 234, 254, 0.9)',
  }

  const inputStyle = {
    width: '100%',
    padding: '16px',
    marginBottom: '14px',
    borderRadius: '16px',
    border: '1px solid #d8e2f0',
    fontSize: '16px',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#ffffff',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
  }

  const buttonStyle = {
    width: '100%',
    padding: '16px 22px',
    borderRadius: '16px',
    border: 'none',
    background: 'linear-gradient(135deg, #0b5cff 0%, #0046c7 100%)',
    color: '#fff',
    fontSize: '17px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '14px',
    boxShadow: '0 12px 28px rgba(0, 70, 199, 0.28)',
    transition: '0.2s ease',
  }

  const sectionStyle = {
    background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    borderRadius: '24px',
    padding: '24px',
    marginBottom: '22px',
    boxShadow: '0 12px 34px rgba(15, 23, 42, 0.08)',
    border: '1px solid #e6edf7',
    textAlign: 'left',
  }

  const cardStyle = {
    background: '#f8fbff',
    border: '1px solid #e6edf7',
    padding: '18px',
    borderRadius: '18px',
    marginBottom: '14px',
    textAlign: 'left',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
  }

  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: '#eaf2ff',
    color: '#0757d8',
    padding: '8px 12px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 'bold',
  }

  const destaqueStyle = {
    background: 'linear-gradient(135deg, #0757d8 0%, #003b9f 100%)',
    color: '#fff',
    borderRadius: '26px',
    padding: '26px',
    boxShadow: '0 18px 42px rgba(0, 70, 199, 0.28)',
  }


function obterProximoPontoFuncionario() {
  if (!usuarioLogado || usuarioLogado.tipo !== 'funcionario') return 'Registrar Ponto'

  const registrosHoje = pontos.filter(
    (p) =>
      p.usuario_id === usuarioLogado.id &&
      p.data_iso === hojeISO()
  )

  const entrada = registrosHoje.find((p) => p.tipo === 'Entrada')
  const saidaAlmoco = registrosHoje.find((p) => p.tipo === 'Saída Almoço')
  const voltaAlmoco = registrosHoje.find((p) => p.tipo === 'Volta Almoço')
  const saida = registrosHoje.find((p) => p.tipo === 'Saída')

  if (usuarioLogado.faz_almoco) {
    if (!entrada) return 'Entrada'
    if (!saidaAlmoco) return 'Saída Almoço'
    if (!voltaAlmoco) return 'Volta Almoço'
    if (!saida) return 'Saída Casa'
    return 'Jornada completa'
  }

  if (!entrada) return 'Entrada'
  if (!saida) return 'Saída Casa'

  return 'Jornada completa'
}

function historicoFuncionarioHoje() {
  if (!usuarioLogado || usuarioLogado.tipo !== 'funcionario') return []

  return pontos
    .filter(
      (p) =>
        p.usuario_id === usuarioLogado.id &&
        p.data_iso === hojeISO()
    )
    .map((p) => ({
      id: p.id,
      tipo: p.tipo,
      data: p.data,
      hora: formatarHoraServidor(p.registrado_em, p.hora),
    }))
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
}

function abrirEdicaoFuncionario(usuario) {

  setFuncionarioEditando(usuario)

  setEditNome(usuario.nome)

  setEditEmail(usuario.email)

  setEditSenha(usuario.senha)
setEditFazAlmoco(usuario.faz_almoco !== false)

  mostrarMensagem(
    'Editando funcionário: ' + usuario.nome
  )

}
async function salvarEdicaoFuncionario() {

  if (
    !editNome ||
    !editEmail ||
    !editSenha
  ) {

    mostrarMensagem(
      'Preencha todos os campos.'
    )

    return
  }

  const { error } = await supabase
    .from('usuarios')
    .update({

      nome: editNome,

      email: editEmail.toLowerCase(),

      senha: editSenha,
faz_almoco: editFazAlmoco,

    })
    .eq(
      'id',
      funcionarioEditando.id
    )

  if (error) {

    mostrarMensagem(
      'Erro ao alterar funcionário.'
    )

    return
  }

  setFuncionarioEditando(null)

  setEditNome('')

  setEditEmail('')

  setEditSenha('')

  await carregarUsuarios()

  mostrarMensagem(
    'Funcionário alterado com sucesso.'
  )
}

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #dbeafe 0%, #eef4fb 42%, #f8fbff 100%)', padding: '18px' }}>
      <div style={containerStyle}>
        {mensagem && (
          <div
            style={{
              background: '#16a34a',
              color: '#fff',
              padding: '16px',
              borderRadius: '16px',
              marginBottom: '18px',
              fontSize: '17px',
              fontWeight: 'bold',
            }}
          >
            {mensagem}
          </div>
        )}

        {!usuarioLogado ? (
          <>
            <div
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: 'linear-gradient(180deg, #0b5cff 0%, #0046c7 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '44px',
                margin: '12px auto 22px',
                boxShadow: '0 12px 28px rgba(0,70,199,0.28)',
              }}
            >
              ◷
            </div>

            <h1 style={{ fontSize: '42px', lineHeight: '1.05', color: '#071638', margin: '0 0 12px' }}>
              Controle de Ponto
            </h1>

            <p style={{ color: '#586174', fontSize: '18px', marginBottom: '34px' }}>
              Acesse sua conta para continuar
            </p>

            <h2 style={{ color: '#0757d8', fontSize: '26px', marginBottom: '22px' }}>
              Login do sistema
            </h2>

            <input style={inputStyle} placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />

            <input style={inputStyle} type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                margin: '8px 0 24px',
                color: '#333',
                fontSize: '16px',
              }}
            >
              <input
                type="checkbox"
                checked={salvarLogin}
                onChange={(e) => setSalvarLogin(e.target.checked)}
              />
              Salvar login neste aparelho
            </label>

            <button style={buttonStyle} onClick={login}>
              ↪ Entrar
            </button>

            <p style={{ color: '#1d5fbf', fontSize: '14px', marginTop: '80px' }}>
              Seguro • Rápido • Confiável
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                background: 'linear-gradient(135deg, #0757d8 0%, #003b9f 70%, #052a73 100%)',
                color: '#fff',
                padding: '30px',
                textAlign: 'left',
                boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#dbeafe',
                      color: '#0757d8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: 'bold',
                    }}
                  >
                    {usuarioLogado.nome?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', opacity: 0.9 }}>Usuário logado:</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{usuarioLogado.nome}</div>
                    {usuarioLogado.empresa_nome && <div style={{ fontSize: '15px', opacity: 0.9 }}>Empresa: {usuarioLogado.empresa_nome}</div>}
                  </div>
                </div>

                <button
                  style={{
                    ...buttonStyle,
                    width: '170px',
                    background: '#062b7a',
                    boxShadow: 'none',
                    marginBottom: 0,
                  }}
                  onClick={sair}
                >
                  ⇱ Sair
                </button>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {usuarioLogado.tipo === 'programador' && (
                <>
                  <div style={sectionStyle}>
                    <p style={{ color: '#0757d8', fontWeight: 'bold', margin: '0 0 8px' }}>▦ Painel</p>
                    <h1 style={{ color: '#071638', fontSize: '38px', lineHeight: '1.05', margin: '0 0 10px' }}>
                      Programador / Multiempresas
                    </h1>
                    <p style={{ color: '#586174', fontSize: '17px', marginTop: 0 }}>
                      Gerencie suas empresas de forma simples e eficiente.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginTop: '22px' }}>
                      <div style={cardStyle}><strong style={{ fontSize: '26px' }}>{empresas.length}</strong><br />Empresas</div>
                      <div style={cardStyle}><strong style={{ fontSize: '26px' }}>{usuarios.filter((u) => u.tipo === 'funcionario').length}</strong><br />Funcionários</div>
                      <div style={cardStyle}><strong style={{ fontSize: '26px' }}>{pontos.filter((p) => p.data_iso === hojeISO()).length}</strong><br />Registros hoje</div>
                    </div>
                  </div>

                  <div style={sectionStyle}>
                    <h2 style={{ color: '#0757d8', marginTop: 0 }}>▥ Criar Empresa</h2>
                    <p style={{ color: '#586174' }}>Preencha os dados abaixo para cadastrar uma nova empresa.</p>

                    <input style={inputStyle} placeholder="Nome da empresa" value={novaEmpresa} onChange={(e) => setNovaEmpresa(e.target.value)} />
                    <input style={inputStyle} placeholder="E-mail master da empresa" value={emailMasterEmpresa} onChange={(e) => setEmailMasterEmpresa(e.target.value)} />
                    <input style={inputStyle} placeholder="Senha master da empresa" value={senhaMasterEmpresa} onChange={(e) => setSenhaMasterEmpresa(e.target.value)} />

                    <button style={buttonStyle} onClick={criarEmpresa}>
                      ＋ Criar Empresa
                    </button>
                  </div>

                  <div style={sectionStyle}>
                    <h2 style={{ color: '#071638', marginTop: 0 }}>Empresas Cadastradas</h2>
                    {empresas.map((empresa) => (
                      <div
                        key={empresa.id}
                        onClick={() => setEmpresaSelecionada(empresa.id)}
                        style={{
                          ...cardStyle,
                          background: empresaSelecionada === empresa.id ? '#dbeafe' : '#f8fbff',
                          border: empresaSelecionada === empresa.id ? '2px solid #0757d8' : '1px solid #e6edf7',
                          cursor: 'pointer',
                        }}
                      >
                        <strong>{empresa.nome}</strong>
                        <br />
                        ID: {empresa.id}
                        <br />
                        Master: {empresa.email_master}
                        <br />
                        Senha Master: {empresa.senha_master}
                        <br />
                        <br />
                        <strong>Clique para ver funcionários, senhas e pontos</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {(usuarioLogado.tipo === 'master' || usuarioLogado.tipo === 'programador') && (
                <>
                  {(usuarioLogado.tipo === 'master' || (usuarioLogado.tipo === 'programador' && empresaSelecionada)) && (
                    <div style={sectionStyle}>
                      <h2 style={{ color: '#0757d8', marginTop: 0 }}>Cadastrar Funcionário</h2>

                      <input style={inputStyle} placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
                      <input style={inputStyle} placeholder="E-mail" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
                      <input style={inputStyle} placeholder="Senha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />

                      <label style={{ display: 'block', marginBottom: '20px' }}>
                        <input type="checkbox" checked={novoFazAlmoco} onChange={(e) => setNovoFazAlmoco(e.target.checked)} />
                        {' '}Intervalo para almoço
                      </label>

                      <button style={buttonStyle} onClick={cadastrarFuncionario}>
                        Cadastrar
                      </button>
                    </div>
                  )}

                  <div style={sectionStyle}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginBottom: '14px',
                      }}
                    >
                      <div>
                        <h2 style={{ color: '#071638', margin: 0 }}>Funcionários</h2>
                        <p style={{ color: '#586174', margin: '6px 0 0' }}>
                          Clique na barra abaixo para abrir, pesquisar e administrar os funcionários.
                        </p>
                      </div>

                      <div
                        style={{
                          background: '#dbeafe',
                          color: '#0757d8',
                          padding: '10px 14px',
                          borderRadius: '999px',
                          fontWeight: 'bold',
                        }}
                      >
                        {usuariosVisiveis().filter((u) => u.tipo === 'funcionario').length} cadastrados
                      </div>
                    </div>

                    {usuarioLogado.tipo === 'programador' && !empresaSelecionada && (
                      <p>Clique em uma empresa para visualizar os funcionários.</p>
                    )}

                    {(usuarioLogado.tipo !== 'programador' || empresaSelecionada) && (
                      <>
                        <button
                          style={{
                            ...buttonStyle,
                            background: mostrarFuncionarios
                              ? '#6b7280'
                              : 'linear-gradient(180deg, #0b5cff 0%, #0046c7 100%)',
                          }}
                          onClick={() => setMostrarFuncionarios(!mostrarFuncionarios)}
                        >
                          {mostrarFuncionarios ? '▲ Ocultar Funcionários' : '▼ Ver / Administrar Funcionários'}
                        </button>

                        {mostrarFuncionarios && (
                          <>
                            <input
                              style={inputStyle}
                              placeholder="Pesquisar funcionário pelo nome, e-mail ou senha"
                              value={buscaFuncionario}
                              onChange={(e) => setBuscaFuncionario(e.target.value)}
                            />

                            <div
                              style={{
                                maxHeight: '520px',
                                overflowY: 'auto',
                                paddingRight: '6px',
                                borderRadius: '18px',
                              }}
                            >
                              {usuariosVisiveis()
                                .filter((u) => u.tipo === 'funcionario')
                                .filter((u) => {
                                  const busca = buscaFuncionario.toLowerCase().trim()

                                  if (!busca) return true

                                  return (
                                    u.nome?.toLowerCase().includes(busca) ||
                                    u.email?.toLowerCase().includes(busca) ||
                                    u.senha?.toLowerCase().includes(busca)
                                  )
                                })
                                .map((u) => (
                                  <div key={u.id} style={cardStyle}>
                                    <strong>{u.nome}</strong>
                                    <br />
                                    Empresa ID: {u.empresa_id}
                                    <br />
                                    E-mail: {u.email}
                                    <br />
                                    Senha: {u.senha}
                                    <br />
                                    Status: {u.ativo === false ? 'Bloqueado' : 'Ativo'}
                                    <br />
                                    <br />

                                    <button style={{ ...buttonStyle, background: '#dc2626' }} onClick={() => excluirFuncionario(u.id)}>
                                      Excluir
                                    </button>

                                    <button style={{ ...buttonStyle, background: '#2563eb' }} onClick={() => abrirEdicaoFuncionario(u)}>
                                      Editar
                                    </button>

                                    {funcionarioEditando && funcionarioEditando.id === u.id && (
                                      <div style={{ background: '#dbeafe', padding: '20px', borderRadius: '16px', marginTop: '20px' }}>
                                        <h2>Editar Funcionário</h2>

                                        <input style={inputStyle} placeholder="Nome" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                                        <input style={inputStyle} placeholder="E-mail" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                                        <input style={inputStyle} placeholder="Senha" value={editSenha} onChange={(e) => setEditSenha(e.target.value)} />

                                        <label style={{ display: 'block', marginTop: '10px', marginBottom: '20px' }}>
                                          <input type="checkbox" checked={editFazAlmoco} onChange={(e) => setEditFazAlmoco(e.target.checked)} />
                                          {' '}Intervalo para almoço
                                        </label>

                                        <button style={buttonStyle} onClick={salvarEdicaoFuncionario}>
                                          Salvar Alterações
                                        </button>

                                        <button style={{ ...buttonStyle, background: '#6b7280' }} onClick={() => setFuncionarioEditando(null)}>
                                          Cancelar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}

                              {usuariosVisiveis()
                                .filter((u) => u.tipo === 'funcionario')
                                .filter((u) => {
                                  const busca = buscaFuncionario.toLowerCase().trim()

                                  if (!busca) return true

                                  return (
                                    u.nome?.toLowerCase().includes(busca) ||
                                    u.email?.toLowerCase().includes(busca) ||
                                    u.senha?.toLowerCase().includes(busca)
                                  )
                                }).length === 0 && (
                                <div style={cardStyle}>
                                  Nenhum funcionário encontrado.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div style={sectionStyle}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginBottom: '14px',
                      }}
                    >
                      <div>
                        <h2 style={{ color: '#071638', margin: 0 }}>Histórico de Pontos do Dia</h2>
                        <p style={{ color: '#586174', margin: '6px 0 0' }}>
                          Clique na barra abaixo para abrir ou ocultar os registros do dia.
                        </p>
                      </div>
                    </div>

                    <input type="date" style={inputStyle} value={dataRelatorio} onChange={(e) => setDataRelatorio(e.target.value)} />

                    {usuarioLogado.tipo === 'programador' && !empresaSelecionada && (
                      <p>Clique em uma empresa para visualizar o histórico de pontos.</p>
                    )}

                    {(usuarioLogado.tipo !== 'programador' || empresaSelecionada) && (
                      <>
                        <button
                          style={{
                            ...buttonStyle,
                            background: mostrarHistoricoDia
                              ? '#6b7280'
                              : 'linear-gradient(180deg, #0b5cff 0%, #0046c7 100%)',
                          }}
                          onClick={() => setMostrarHistoricoDia(!mostrarHistoricoDia)}
                        >
                          {mostrarHistoricoDia ? '▲ Ocultar Histórico do Dia' : '▼ Ver Histórico de Pontos do Dia'}
                        </button>

                        {mostrarHistoricoDia && (
                          <>
                            {empresasVisiveis()
                              .filter((empresa) => (usuarioLogado.tipo === 'programador' ? empresa.id === empresaSelecionada : true))
                              .map((empresa) => (
                                <div key={empresa.id}>
                                  {usuarioLogado.tipo === 'programador' && (
                                    <h2 style={{ color: '#001f6b' }}>Empresa: {empresa.nome}</h2>
                                  )}

                                  {gerarHistoricoDia(empresa.id).length === 0 ? (
                                    <div style={cardStyle}>
                                      Nenhum registro encontrado para esta data.
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        maxHeight: '520px',
                                        overflowY: 'auto',
                                        paddingRight: '6px',
                                        borderRadius: '18px',
                                      }}
                                    >
                                      {gerarHistoricoDia(empresa.id).map((r) => (
                                        <div key={`${empresa.id}-${r.id}`} style={cardStyle}>
                                          <strong>{r.nome}</strong>
                                          <br />
                                          Data: {r.data}
                                          <br />
                                          Horário: {r.hora || '-'}
                                          <br />
                                          Tipo: {r.tipo}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <div style={sectionStyle}>
                    <h2 style={{ color: '#071638', marginTop: 0 }}>Relatório Mensal por Funcionário</h2>
                    <p style={{ color: '#586174', marginTop: 0 }}>
                      Consulte todos os registros do mês e filtre por funcionário ou horário.
                    </p>

                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                      Mês
                    </label>
                    <input
                      type="month"
                      style={inputStyle}
                      value={mesRelatorioMensal}
                      onChange={(e) => setMesRelatorioMensal(e.target.value)}
                    />

                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                      Funcionário
                    </label>
                    <select
                      style={inputStyle}
                      value={funcionarioRelatorioMensal}
                      onChange={(e) => setFuncionarioRelatorioMensal(e.target.value)}
                    >
                      <option value="todos">Todos os funcionários</option>
                      {usuariosVisiveis()
                        .filter((u) => u.tipo === 'funcionario')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                    </select>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                          Hora inicial
                        </label>
                        <input
                          type="time"
                          style={inputStyle}
                          value={horaInicioRelatorioMensal}
                          onChange={(e) => setHoraInicioRelatorioMensal(e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                          Hora final
                        </label>
                        <input
                          type="time"
                          style={inputStyle}
                          value={horaFimRelatorioMensal}
                          onChange={(e) => setHoraFimRelatorioMensal(e.target.value)}
                        />
                      </div>
                    </div>

                    {usuarioLogado.tipo === 'programador' && !empresaSelecionada && (
                      <p>Clique em uma empresa para visualizar o relatório mensal.</p>
                    )}

                    {(usuarioLogado.tipo !== 'programador' || empresaSelecionada) && (
                      <button
                        style={{
                          ...buttonStyle,
                          background: mostrarRelatorioMensal
                            ? '#6b7280'
                            : 'linear-gradient(180deg, #0b5cff 0%, #0046c7 100%)',
                        }}
                        onClick={() => setMostrarRelatorioMensal(!mostrarRelatorioMensal)}
                      >
                        {mostrarRelatorioMensal ? '▲ Ocultar Relatório Mensal' : '▼ Ver Relatório Mensal'}
                      </button>
                    )}

                    {mostrarRelatorioMensal && (
                      <>
                        {empresasVisiveis()
                          .filter((empresa) => (usuarioLogado.tipo === 'programador' ? empresa.id === empresaSelecionada : true))
                          .map((empresa) => {
                            const registrosMensais = gerarRelatorioMensal(empresa.id)

                            return (
                              <div key={`mensal-${empresa.id}`}>
                                {usuarioLogado.tipo === 'programador' && (
                                  <h2 style={{ color: '#001f6b' }}>Empresa: {empresa.nome}</h2>
                                )}

                                {registrosMensais.length === 0 ? (
                                  <div style={cardStyle}>
                                    Nenhum registro encontrado para os filtros selecionados.
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      maxHeight: '520px',
                                      overflowY: 'auto',
                                      paddingRight: '6px',
                                      borderRadius: '18px',
                                    }}
                                  >
                                    {registrosMensais.map((r) => (
                                      <div key={`mensal-${empresa.id}-${r.id}`} style={cardStyle}>
                                        <strong>{r.nome}</strong>
                                        <br />
                                        Data: {r.data}
                                        <br />
                                        Horário: {r.hora || '-'}
                                        <br />
                                        Tipo: {r.tipo}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </>
                    )}
                  </div>
                  <div style={sectionStyle}>
                    <h2 style={{ color: '#071638', marginTop: 0 }}>Exportar Relatório em PDF</h2>
                    <p style={{ color: '#586174', marginTop: 0 }}>
                      Gere o PDF do relatório diário com entrada, almoço, volta do almoço e saída casa.
                    </p>

                    <input type="date" style={inputStyle} value={dataRelatorio} onChange={(e) => setDataRelatorio(e.target.value)} />

                    {usuarioLogado.tipo === 'programador' && !empresaSelecionada && (
                      <p>Clique em uma empresa para exportar o relatório em PDF.</p>
                    )}

                    {(usuarioLogado.tipo !== 'programador' || empresaSelecionada) && (
                      <button style={{ ...buttonStyle, background: '#16a34a' }} onClick={exportarRelatorioPDF}>
                        Exportar PDF
                      </button>
                    )}
                  </div>

                </>
              )}

              {usuarioLogado.tipo === 'funcionario' && (
                <div style={{ ...sectionStyle, padding: '0', overflow: 'hidden' }}>
                  <div style={destaqueStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ ...chipStyle, background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                          ◷ Horário oficial da internet
                        </div>
                        <h1 style={{ color: '#fff', margin: '18px 0 8px', fontSize: '38px', lineHeight: '1.05' }}>
                          Registrar Ponto
                        </h1>
                        <p style={{ color: '#dbeafe', margin: 0, fontSize: '17px' }}>
                          Próximo registro: <strong style={{ color: '#fff' }}>{obterProximoPontoFuncionario()}</strong>
                        </p>
                      </div>

                      <div
                        style={{
                          width: '86px',
                          height: '86px',
                          borderRadius: '28px',
                          background: 'rgba(255,255,255,0.16)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '42px',
                          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
                        }}
                      >
                        🕒
                      </div>
                    </div>

                    <button
                      style={{
                        ...buttonStyle,
                        marginTop: '24px',
                        marginBottom: 0,
                        fontSize: '20px',
                        padding: '22px',
                        background: '#ffffff',
                        color: '#0757d8',
                        boxShadow: '0 14px 34px rgba(0,0,0,0.18)',
                        opacity: registrandoPonto ? 0.75 : 1,
                      }}
                      onClick={registrarPonto}
                      disabled={registrandoPonto || obterProximoPontoFuncionario() === 'Jornada completa'}
                    >
                      {registrandoPonto ? 'Consultando horário oficial...' : obterProximoPontoFuncionario() === 'Jornada completa' ? 'Jornada completa hoje' : 'Registrar Ponto'}
                    </button>
                  </div>

                  <div style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      <div>
                        <h2 style={{ color: '#071638', margin: 0 }}>Meus pontos de hoje</h2>
                        <p style={{ color: '#586174', margin: '6px 0 0' }}>
                          Acompanhe os registros feitos neste aparelho.
                        </p>
                      </div>
                      <span style={chipStyle}>{historicoFuncionarioHoje().length} registros</span>
                    </div>

                    {historicoFuncionarioHoje().length === 0 ? (
                      <div style={cardStyle}>
                        Nenhum ponto registrado hoje.
                      </div>
                    ) : (
                      historicoFuncionarioHoje().map((registro) => (
                        <div
                          key={`func-dia-${registro.id}`}
                          style={{
                            ...cardStyle,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div>
                            <strong>{registro.tipo}</strong>
                            <br />
                            <span style={{ color: '#586174' }}>{registro.data}</span>
                          </div>
                          <strong style={{ color: '#0757d8', fontSize: '20px' }}>{registro.hora || '-'}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <p style={{ color: '#666', letterSpacing: '2px', fontSize: '11px', paddingBottom: usuarioLogado ? '20px' : 0 }}>
          DEVELOPED BY DINHO OLIVEIRA
        </p>
      </div>
    </div>
  )
}

export default App