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
  const [empresaEditandoMaster, setEmpresaEditandoMaster] = useState(null)
  const [editEmpresaNome, setEditEmpresaNome] = useState('')
  const [editEmpresaEmailMaster, setEditEmpresaEmailMaster] = useState('')
  const [editEmpresaSenhaMaster, setEditEmpresaSenhaMaster] = useState('')
  const [editEmpresaAtiva, setEditEmpresaAtiva] = useState(true)
  const [registrandoPonto, setRegistrandoPonto] = useState(false)
  const [localizacaoAutorizada, setLocalizacaoAutorizada] = useState(false)
  const [solicitandoLocalizacao, setSolicitandoLocalizacao] = useState(false)
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
const [notificacoesPontoAtivas, setNotificacoesPontoAtivas] = useState(false)
const [auditoria, setAuditoria] = useState([])
const [mostrarAuditoria, setMostrarAuditoria] = useState(false)
const [buscaAuditoria, setBuscaAuditoria] = useState('')
const [dataInicioAuditoria, setDataInicioAuditoria] = useState('')
const [dataFimAuditoria, setDataFimAuditoria] = useState('')
const [mostrarAvisoLegalLogado, setMostrarAvisoLegalLogado] = useState(false)
const [mostrarTermoResponsabilidade, setMostrarTermoResponsabilidade] = useState(false)
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
    return data || []
  }

  async function carregarAuditoria() {
    const { data, error } = await supabase
      .from('auditoria')
      .select('*')
      .order('id', { ascending: false })
      .limit(300)

    if (!error && data) {
      setAuditoria(data)
    }
  }

  useEffect(() => {
    carregarEmpresas()
    carregarUsuarios()
    carregarPontos()
    carregarAuditoria()

    const canal = supabase
      .channel('tempo-real')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pontos' }, async () => carregarPontos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, async () => carregarUsuarios())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresas' }, async () => carregarEmpresas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auditoria' }, async () => carregarAuditoria())
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

useEffect(() => {
  if (!usuarioLogado || usuarioLogado.tipo !== 'master') {
    setNotificacoesPontoAtivas(false)
    return
  }

  const chave = `notificacaoPontoMaster_${usuarioLogado.empresa_id}`
  setNotificacoesPontoAtivas(localStorage.getItem(chave) === 'true')
}, [usuarioLogado])

useEffect(() => {
  if (!usuarioLogado || usuarioLogado.tipo !== 'master' || !notificacoesPontoAtivas) return

  const canalNotificacoes = supabase
    .channel(`notificacoes-ponto-master-${usuarioLogado.empresa_id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pontos' },
      (payload) => {
        const pontoNovo = payload.new

        if (!pontoNovo || pontoNovo.empresa_id !== usuarioLogado.empresa_id) return

        mostrarNotificacaoPonto(pontoNovo)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(canalNotificacoes)
  }
}, [usuarioLogado, notificacoesPontoAtivas])

useEffect(() => {
  if (!usuarioLogado || usuarioLogado.tipo !== 'funcionario') {
    setLocalizacaoAutorizada(false)
    setSolicitandoLocalizacao(false)
    return
  }

  verificarLocalizacaoFuncionario()
}, [usuarioLogado])

useEffect(() => {
  if (!usuarioLogado) {
    setMostrarAvisoLegalLogado(false)
    setMostrarTermoResponsabilidade(false)
    return
  }

  const termoJaAceito = localStorage.getItem('termoResponsabilidadeAceito_v1') === 'true'

  if (!termoJaAceito) {
    setMostrarTermoResponsabilidade(true)
    setMostrarAvisoLegalLogado(false)
    return
  }

  setMostrarTermoResponsabilidade(false)
  setMostrarAvisoLegalLogado(true)
}, [usuarioLogado])

  function mostrarMensagem(texto) {
    setMensagem(texto)
    setTimeout(() => setMensagem(''), 4000)
  }

  async function registrarAuditoria(acao, detalhes = '', usuarioReferencia = usuarioLogado) {
    try {
      await supabase.from('auditoria').insert([
        {
          usuario: usuarioReferencia?.nome || usuarioReferencia?.email || email || 'Sistema',
          tipo_usuario: usuarioReferencia?.tipo || 'sistema',
          empresa_id: usuarioReferencia?.empresa_id || empresaSelecionada || null,
          acao,
          detalhes,
        },
      ])

      await carregarAuditoria()
    } catch (erro) {
      // A auditoria nunca deve travar o sistema principal.
    }
  }

  function auditoriaFiltrada() {
    return auditoria.filter((item) => {
      const busca = buscaAuditoria.toLowerCase().trim()
      const texto = [
        item.usuario,
        item.tipo_usuario,
        item.acao,
        item.detalhes,
        item.empresa_id,
      ]
        .join(' ')
        .toLowerCase()

      if (busca && !texto.includes(busca)) return false

      const dataItem = item.criado_em ? formatarDataISO(item.criado_em) : ''

      if (dataInicioAuditoria && dataItem < dataInicioAuditoria) return false
      if (dataFimAuditoria && dataItem > dataFimAuditoria) return false

      return true
    })
  }

  function exportarAuditoriaPDF() {
    const registros = auditoriaFiltrada()

    const janela = window.open('', '', 'width=1000,height=700')

    let html = `
      <html>
        <head>
          <title>Auditoria do Sistema</title>
          <style>
            body{font-family:Arial;padding:30px;}
            h1,h2{text-align:center;color:#001f6b;}
            table{width:100%;border-collapse:collapse;margin-top:25px;font-size:12px;}
            th,td{border:1px solid #999;padding:8px;text-align:left;}
            th{background:#001f6b;color:white;}
            .rodape{margin-top:40px;text-align:center;font-size:12px;letter-spacing:2px;color:#666;}
          </style>
        </head>
        <body>
          <h1>Auditoria do Sistema</h1>
          <h2>Controle de Ponto</h2>
          <table>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Empresa</th>
              <th>Ação</th>
              <th>Detalhes</th>
            </tr>
    `

    registros.forEach((item) => {
      html += `
        <tr>
          <td>${item.criado_em ? new Date(item.criado_em).toLocaleString('pt-BR') : '-'}</td>
          <td>${item.usuario || '-'}</td>
          <td>${item.tipo_usuario || '-'}</td>
          <td>${item.empresa_id || '-'}</td>
          <td>${item.acao || '-'}</td>
          <td>${item.detalhes || '-'}</td>
        </tr>
      `
    })

    html += `
          </table>
          <div style="margin-top:25px;font-size:11px;color:#555;text-align:center;">
            Sistema auxiliar de organização interna de jornada. Não é REP/registrador eletrônico oficial e não substitui obrigações legais, fiscais, trabalhistas ou contábeis da empresa.
          </div>
          <div class="rodape">DEVELOPED BY DINHO OLIVEIRA</div>
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

  async function alternarNotificacoesPonto() {
    if (!usuarioLogado || usuarioLogado.tipo !== 'master') return

    if (!('Notification' in window)) {
      mostrarMensagem('Este navegador não suporta notificações.')
      return
    }

    if (!notificacoesPontoAtivas && Notification.permission !== 'granted') {
      const permissao = await Notification.requestPermission()

      if (permissao !== 'granted') {
        mostrarMensagem('Permissão de notificação não autorizada no aparelho.')
        return
      }
    }

    const novoValor = !notificacoesPontoAtivas
    const chave = `notificacaoPontoMaster_${usuarioLogado.empresa_id}`

    localStorage.setItem(chave, String(novoValor))
    setNotificacoesPontoAtivas(novoValor)

    mostrarMensagem(
      novoValor
        ? 'Notificações de ponto ativadas neste aparelho.'
        : 'Notificações de ponto desativadas neste aparelho.'
    )
  }

  function mostrarNotificacaoPonto(ponto) {
    const hora = formatarHoraServidor(ponto.registrado_em, ponto.hora)
    const titulo = 'Novo ponto registrado'
    const corpo = `${ponto.nome || 'Funcionário'} - ${ponto.tipo || 'Ponto'} às ${hora}`

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, {
        body: corpo,
        icon: '/vite.svg',
      })
    }
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

  function formatarDataISOParaBR(dataISO) {
    if (!dataISO || !dataISO.includes('-')) return '-'

    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function somarDiasISO(dataISO, quantidadeDias) {
    const [ano, mes, dia] = dataISO.split('-').map(Number)
    const data = new Date(Date.UTC(ano, mes - 1, dia))
    data.setUTCDate(data.getUTCDate() + quantidadeDias)

    return data.toISOString().slice(0, 10)
  }

  function obterDataJornadaISO(usuarioId, dataOficialISO, horaOficialBR) {
    const LIMITE_MADRUGADA_MINUTOS = 6 * 60
    const minutosAgora = horaParaMinutos(horaOficialBR)

    if (minutosAgora === null || minutosAgora >= LIMITE_MADRUGADA_MINUTOS) {
      return dataOficialISO
    }

    const dataAnteriorISO = somarDiasISO(dataOficialISO, -1)

    const registrosOntem = pontos.filter(
      (p) =>
        p.usuario_id === usuarioId &&
        p.data_iso === dataAnteriorISO
    )

    const temEntradaOntem = registrosOntem.some((p) => p.tipo === 'Entrada')
    const temSaidaOntem = registrosOntem.some((p) => p.tipo === 'Saída')

    if (temEntradaOntem && !temSaidaOntem) {
      return dataAnteriorISO
    }

    return dataOficialISO
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

  function normalizarTipoPonto(tipo) {
    const texto = String(tipo || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

    if (texto === 'entrada') return 'Entrada'
    if (texto.includes('saida') && texto.includes('almoco')) return 'Saída Almoço'
    if (texto.includes('volta') && texto.includes('almoco')) return 'Volta Almoço'
    if (texto === 'saida' || texto.includes('saida casa')) return 'Saída'

    return tipo || ''
  }

  function obterTimestampRegistro(registro) {
    const dataHora = registro?.registrado_em || registro?.created_at

    if (dataHora) {
      const timestamp = new Date(dataHora).getTime()
      if (!Number.isNaN(timestamp)) return timestamp
    }

    const hora = registro?.hora || '00:00:00'
    const dataISO = registro?.data_iso || hojeISO()
    const timestampFallback = new Date(`${dataISO}T${hora}`).getTime()

    return Number.isNaN(timestampFallback) ? 0 : timestampFallback
  }

  async function verificarLocalizacaoFuncionario() {
    if (!usuarioLogado || usuarioLogado.tipo !== 'funcionario') return

    if (!navigator.geolocation) {
      setLocalizacaoAutorizada(false)
      mostrarMensagem('Este aparelho ou navegador não suporta localização. Use um aparelho com GPS para bater ponto.')
      return
    }

    setSolicitandoLocalizacao(true)

    try {
      await obterLocalizacaoObrigatoria(false)
      setLocalizacaoAutorizada(true)
    } catch (erro) {
      setLocalizacaoAutorizada(false)
      mostrarMensagem(erro.message || 'A localização é obrigatória para bater ponto.')
    } finally {
      setSolicitandoLocalizacao(false)
    }
  }

  function textoStatusLocalizacao() {
    if (usuarioLogado?.tipo !== 'funcionario') return ''
    if (solicitandoLocalizacao) return 'Solicitando localização do aparelho...'
    if (localizacaoAutorizada) return 'Localização autorizada neste aparelho.'
    return 'Localização obrigatória: permita o acesso para liberar o ponto.'
  }

  function obterLocalizacaoObrigatoria(atualizarEstado = true) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Este aparelho ou navegador não suporta localização.'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (posicao) => {
          const { latitude, longitude, accuracy } = posicao.coords || {}

          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            reject(new Error('Não foi possível obter uma localização válida.'))
            return
          }

          if (atualizarEstado) setLocalizacaoAutorizada(true)

          resolve({
            latitude,
            longitude,
            precisao: typeof accuracy === 'number' ? accuracy : null,
            link: `https://www.google.com/maps?q=${latitude},${longitude}`,
          })
        },
        () => {
          if (atualizarEstado) setLocalizacaoAutorizada(false)
          reject(new Error('Autorize a localização do aparelho para registrar o ponto.'))
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      )
    })
  }

  function formatarCoordenada(valor) {
    if (typeof valor !== 'number') return null
    return valor.toFixed(6)
  }

  function obterLocalizacaoRegistro(registro) {
    const latitude = typeof registro?.latitude === 'number'
      ? registro.latitude
      : Number(registro?.latitude)

    const longitude = typeof registro?.longitude === 'number'
      ? registro.longitude
      : Number(registro?.longitude)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return {
        texto: 'Não registrada',
        link: '',
        precisao: '',
      }
    }

    const precisao = registro?.precisao_localizacao
      ? `Precisão: ${Math.round(Number(registro.precisao_localizacao))}m`
      : ''

    return {
      texto: `${formatarCoordenada(latitude)}, ${formatarCoordenada(longitude)}`,
      link: registro?.link_localizacao || `https://www.google.com/maps?q=${latitude},${longitude}`,
      precisao,
    }
  }

  function localizacaoParaHTML(localizacao) {
    if (!localizacao || !localizacao.link) return 'Não registrada'

    return `<a href="${localizacao.link}" target="_blank">Ver no mapa</a><br/><small>${localizacao.texto}${localizacao.precisao ? ' - ' + localizacao.precisao : ''}</small>`
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
      await registrarAuditoria(
        'LOGIN_PROGRAMADOR',
        'Login realizado no painel do programador.',
        {
          nome: 'PROGRAMADOR',
          tipo: 'programador',
          email: 'programador@lc.com',
          empresa_id: null,
        }
      )

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
      await registrarAuditoria(
        'LOGIN_MASTER',
        `Login master realizado na empresa ${empresaMaster.nome}.`,
        {
          nome: 'MASTER',
          tipo: 'master',
          email,
          empresa_id: empresaMaster.id,
        }
      )

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

    await registrarAuditoria(
      'LOGIN_FUNCIONARIO',
      `Funcionário ${usuario.nome} acessou o sistema.`,
      usuario
    )

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

  async function aceitarTermoResponsabilidade() {
    localStorage.setItem('termoResponsabilidadeAceito_v1', 'true')
    localStorage.setItem(
      'termoResponsabilidadeDados_v1',
      JSON.stringify({
        usuario: usuarioLogado?.nome || usuarioLogado?.email || 'Usuário',
        tipo_usuario: usuarioLogado?.tipo || '',
        empresa_id: usuarioLogado?.empresa_id || null,
        data_hora: new Date().toISOString(),
        versao: 'v1',
      })
    )

    setMostrarTermoResponsabilidade(false)
    setMostrarAvisoLegalLogado(true)

    await registrarAuditoria(
      'ACEITE_TERMO_RESPONSABILIDADE',
      'Usuário aceitou o termo de responsabilidade e ciência de uso auxiliar interno do sistema.'
    )

    mostrarMensagem('Termo aceito. Sistema liberado para uso.')
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
    await registrarAuditoria('CRIAR_EMPRESA', `Empresa criada: ${novaEmpresa}.`)
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
    await registrarAuditoria('CADASTRAR_FUNCIONARIO', `Funcionário cadastrado: ${novoNome}.`)
    mostrarMensagem('Funcionário cadastrado com sucesso!')
  }

  async function excluirFuncionario(id) {
    const funcionario = usuarios.find((u) => u.id === id)
    const confirmar = confirm('Deseja realmente bloquear este funcionário? O histórico de pontos será mantido.')
    if (!confirmar) return

    await supabase.from('usuarios').update({ ativo: false }).eq('id', id)
    await carregarUsuarios()
    await registrarAuditoria('BLOQUEAR_FUNCIONARIO', `Funcionário bloqueado: ${funcionario?.nome || id}.`)
    mostrarMensagem('Funcionário bloqueado.')
  }

  async function reativarFuncionario(id) {
    const funcionario = usuarios.find((u) => u.id === id)
    const confirmar = confirm('Deseja reativar este funcionário?')
    if (!confirmar) return

    await supabase.from('usuarios').update({ ativo: true }).eq('id', id)
    await carregarUsuarios()
    await registrarAuditoria('REATIVAR_FUNCIONARIO', `Funcionário reativado: ${funcionario?.nome || id}.`)
    mostrarMensagem('Funcionário reativado.')
  }

  async function excluirFuncionarioDefinitivo(id) {
    if (usuarioLogado?.tipo !== 'programador') {
      mostrarMensagem('Apenas o usuário programador pode excluir definitivamente.')
      return
    }

    const funcionario = usuarios.find((u) => u.id === id)

    const confirmar = confirm(
      `ATENÇÃO: deseja excluir definitivamente ${funcionario?.nome || 'este funcionário'}? Todos os pontos e relatórios dele serão apagados do sistema.`
    )

    if (!confirmar) return

    const confirmarFinal = confirm(
      'Confirme novamente. Esta ação não pode ser desfeita e não deixará histórico de ponto deste funcionário.'
    )

    if (!confirmarFinal) return

    const { error: erroPontos } = await supabase
      .from('pontos')
      .delete()
      .eq('usuario_id', id)

    if (erroPontos) {
      mostrarMensagem('Erro ao excluir os pontos do funcionário.')
      return
    }

    try {
      if (funcionario?.nome) {
        await supabase.from('auditoria').delete().eq('usuario', funcionario.nome)
        await supabase.from('auditoria').delete().ilike('detalhes', `%${funcionario.nome}%`)
      }
    } catch (erro) {
      // A limpeza da auditoria não deve travar a exclusão principal.
    }

    const { error: erroUsuario } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id)

    if (erroUsuario) {
      mostrarMensagem('Erro ao excluir o funcionário.')
      return
    }

    setPontos((listaAtual) => listaAtual.filter((p) => String(p.usuario_id) !== String(id)))
    setUsuarios((listaAtual) => listaAtual.filter((u) => String(u.id) !== String(id)))

    if (funcionarioEditando?.id === id) {
      setFuncionarioEditando(null)
    }

    await carregarUsuarios()
    await carregarPontos()
    await carregarAuditoria()

    mostrarMensagem('Funcionário excluído definitivamente. Pontos e relatórios removidos.')
  }

 async function registrarPonto() {

  if (registrandoPonto) return

  setRegistrandoPonto(true)

  if (!localizacaoAutorizada) {
    try {
      mostrarMensagem('Autorize a localização para liberar o registro de ponto.')
      await obterLocalizacaoObrigatoria()
      setLocalizacaoAutorizada(true)
    } catch (erro) {
      mostrarMensagem(erro.message || 'Localização obrigatória. Autorize a localização do aparelho para bater o ponto.')
      setRegistrandoPonto(false)
      return
    }
  }

  let horarioOficial

  try {
    horarioOficial = await obterHorarioOficial()
  } catch (erro) {
    mostrarMensagem('Não foi possível consultar o horário oficial da internet. Verifique a conexão e tente novamente.')
    setRegistrandoPonto(false)
    return
  }

  let localizacaoPonto

  try {
    mostrarMensagem('Autorize a localização para registrar o ponto.')
    localizacaoPonto = await obterLocalizacaoObrigatoria()
  } catch (erro) {
    mostrarMensagem(erro.message || 'Localização obrigatória. Autorize a localização do aparelho para bater o ponto.')
    setRegistrandoPonto(false)
    return
  }

  const dataOficialISO = formatarDataISO(horarioOficial)
  const horaOficialBR = formatarHoraBR(horarioOficial)
  const dataJornadaISO = obterDataJornadaISO(usuarioLogado.id, dataOficialISO, horaOficialBR)
  const dataJornadaBR = formatarDataISOParaBR(dataJornadaISO)

  const registrosJornada = pontos.filter(
    (p) =>
      p.usuario_id === usuarioLogado.id &&
      p.data_iso === dataJornadaISO
  )

  const entrada = registrosJornada.find((p) => p.tipo === 'Entrada')
  const saidaAlmoco = registrosJornada.find((p) => p.tipo === 'Saída Almoço')
  const voltaAlmoco = registrosJornada.find((p) => p.tipo === 'Volta Almoço')
  const saida = registrosJornada.find((p) => p.tipo === 'Saída')

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
      mostrarMensagem('Você já registrou todos os pontos desta jornada.')
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
      mostrarMensagem('Você já registrou entrada e saída nesta jornada.')
      setRegistrandoPonto(false)
      return
    }

  }

  const MINUTOS_MINIMOS_ENTRE_PONTOS = 10
  const ultimoRegistroJornada = [...registrosJornada].sort(
    (a, b) => obterTimestampRegistro(b) - obterTimestampRegistro(a)
  )[0]

  if (ultimoRegistroJornada) {
    const timestampUltimoRegistro = obterTimestampRegistro(ultimoRegistroJornada)
    const diferencaMinutos = Math.floor((horarioOficial.getTime() - timestampUltimoRegistro) / 60000)

    if (diferencaMinutos >= 0 && diferencaMinutos < MINUTOS_MINIMOS_ENTRE_PONTOS) {
      const tipoAnterior = normalizarTipoPonto(ultimoRegistroJornada.tipo)
      const horaAnterior = formatarHoraServidor(ultimoRegistroJornada.registrado_em, ultimoRegistroJornada.hora)

      const confirmarIntervaloCurto = confirm(
        `Atenção: o último ponto foi ${tipoAnterior} às ${horaAnterior}, há apenas ${diferencaMinutos} minuto(s).\n\nO próximo registro será ${tipo}.\n\nConfirma que deseja registrar mesmo assim?`
      )

      if (!confirmarIntervaloCurto) {
        mostrarMensagem('Registro cancelado. Aguarde mais alguns minutos antes de bater o próximo ponto.')
        setRegistrandoPonto(false)
        return
      }

      await registrarAuditoria(
        'ALERTA_INTERVALO_CURTO',
        `${usuarioLogado.nome} confirmou ${tipo} apenas ${diferencaMinutos} minuto(s) após ${tipoAnterior} (${horaAnterior}).`
      )
    }
  }

  const { data: pontoInserido, error } = await supabase
    .from('pontos')
    .insert([
      {
        usuario_id: usuarioLogado.id,
        empresa_id: usuarioLogado.empresa_id,
        nome: usuarioLogado.nome,
        data: dataJornadaBR,
        data_iso: dataJornadaISO,
        hora: horaOficialBR,
        tipo,
        latitude: localizacaoPonto.latitude,
        longitude: localizacaoPonto.longitude,
        precisao_localizacao: localizacaoPonto.precisao,
        link_localizacao: localizacaoPonto.link,
      },
    ])
    .select('*')
    .single()

  if (error) {
    mostrarMensagem('Erro ao registrar ponto.')
    setRegistrandoPonto(false)
    return
  }
    if (pontoInserido) {
      setPontos((listaAtual) => [
        pontoInserido,
        ...listaAtual.filter((p) => p.id !== pontoInserido.id),
      ])
    }

    setDataRelatorio(dataJornadaISO)

    carregarPontos().then((pontosAtualizados) => {
      if (pontoInserido && !pontosAtualizados.some((p) => p.id === pontoInserido.id)) {
        setPontos((listaAtual) => [
          pontoInserido,
          ...listaAtual.filter((p) => p.id !== pontoInserido.id),
        ])
      }
    })

    await registrarAuditoria(
      'REGISTRAR_PONTO',
      `${usuarioLogado.nome} registrou ${tipo} às ${horaOficialBR} na jornada de ${dataJornadaBR}. Localização: ${localizacaoPonto.link}`
    )
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
      const dataComparacao = (obterTimestampRegistro(b) || 0) - (obterTimestampRegistro(a) || 0)
      if (dataComparacao !== 0) return dataComparacao

      return (a.nome || '').localeCompare(b.nome || '')
    })
}

function horaParaMinutos(hora) {
  if (!hora || hora === '-') return null

  const partes = hora.split(':')

  if (partes.length < 2) return null

  return Number(partes[0]) * 60 + Number(partes[1])
}


function horarioDentroDoFiltro(minutos, inicioFiltro, fimFiltro) {
  if (minutos === null) return false

  if (inicioFiltro === null && fimFiltro === null) return true

  if (inicioFiltro !== null && fimFiltro !== null && inicioFiltro > fimFiltro) {
    return minutos >= inicioFiltro || minutos <= fimFiltro
  }

  if (inicioFiltro !== null && minutos < inicioFiltro) return false
  if (fimFiltro !== null && minutos > fimFiltro) return false

  return true
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

function criarLinhaJornada(registro) {
  return {
    usuario_id: registro.usuario_id,
    nome: registro.nome,
    data: registro.data,
    data_iso: registro.data_iso,
    entrada: '',
    saidaAlmoco: '',
    voltaAlmoco: '',
    saida: '',
    ultimoPontoTipo: '',
    ultimoPontoHora: '',
    ultimoPontoTimestamp: 0,
    ultimoPontoLocalizacao: null,
    localizacaoEntrada: null,
    localizacaoSaidaAlmoco: null,
    localizacaoVoltaAlmoco: null,
    localizacaoSaida: null,
    faz_almoco: usuarios.find((u) => String(u.id) === String(registro.usuario_id))?.faz_almoco !== false,
  }
}

function preencherLinhaJornada(linha, registro) {
  const tipo = normalizarTipoPonto(registro.tipo)
  const hora = formatarHoraServidor(registro.registrado_em, registro.hora)
  const timestamp = obterTimestampRegistro(registro)
  const localizacao = obterLocalizacaoRegistro(registro)

  if (tipo === 'Entrada') {
    linha.entrada = hora
    linha.localizacaoEntrada = localizacao
  }

  if (tipo === 'Saída Almoço') {
    linha.saidaAlmoco = hora
    linha.localizacaoSaidaAlmoco = localizacao
  }

  if (tipo === 'Volta Almoço') {
    linha.voltaAlmoco = hora
    linha.localizacaoVoltaAlmoco = localizacao
  }

  if (tipo === 'Saída') {
    linha.saida = hora
    linha.localizacaoSaida = localizacao
  }

  if (timestamp >= (linha.ultimoPontoTimestamp || 0)) {
    linha.ultimoPontoTimestamp = timestamp
    linha.ultimoPontoTipo = tipo
    linha.ultimoPontoHora = hora
    linha.ultimoPontoLocalizacao = localizacao
  }
}

function statusLinhaJornada(linha) {
  if (linha.faz_almoco) {
    return linha.entrada && linha.saidaAlmoco && linha.voltaAlmoco && linha.saida
      ? 'Completo'
      : 'Pendente'
  }

  return linha.entrada && linha.saida ? 'Completo' : 'Pendente'
}

function horaComVirada(linha, campo) {
  const valor = linha[campo]

  if (!valor) return '-'

  if (campo === 'saida' && linha.entrada) {
    const entradaMinutos = horaParaMinutos(linha.entrada)
    const saidaMinutos = horaParaMinutos(valor)

    if (entradaMinutos !== null && saidaMinutos !== null && saidaMinutos < entradaMinutos) {
      return `${valor} (+1 dia)`
    }
  }

  return valor
}

function gerarRelatorioDiarioOrganizado(empresaId = usuarioLogado?.empresa_id) {
  const idEmpresa = empresaId || empresaSelecionada || usuarioLogado?.empresa_id

  if (!idEmpresa || !dataRelatorio) return []

  const agrupado = {}

  pontos
    .filter((p) => p.empresa_id === idEmpresa && p.data_iso === dataRelatorio)
    .forEach((registro) => {
      const chave = `${registro.usuario_id || registro.nome}-${registro.data_iso}`

      if (!agrupado[chave]) {
        agrupado[chave] = criarLinhaJornada(registro)
      }

      preencherLinhaJornada(agrupado[chave], registro)
    })

  return Object.values(agrupado)
    .map((linha) => ({
      ...linha,
      status: statusLinhaJornada(linha),
    }))
    .sort((a, b) => {
      const dataComparacao = (b.ultimoPontoTimestamp || 0) - (a.ultimoPontoTimestamp || 0)
      if (dataComparacao !== 0) return dataComparacao

      return (a.nome || '').localeCompare(b.nome || '')
    })
}

function gerarRelatorioMensalOrganizado(empresaId = usuarioLogado?.empresa_id) {
  const idEmpresa = empresaId || empresaSelecionada || usuarioLogado?.empresa_id

  if (!idEmpresa || !mesRelatorioMensal) return []

  const inicioFiltro = horaInicioRelatorioMensal ? horaParaMinutos(horaInicioRelatorioMensal) : null
  const fimFiltro = horaFimRelatorioMensal ? horaParaMinutos(horaFimRelatorioMensal) : null
  const agrupado = {}

  pontos
    .filter((p) => {
      if (p.empresa_id !== idEmpresa) return false
      if (!p.data_iso?.startsWith(mesRelatorioMensal)) return false

      if (
        funcionarioRelatorioMensal !== 'todos' &&
        String(p.usuario_id) !== String(funcionarioRelatorioMensal)
      ) {
        return false
      }

      return true
    })
    .forEach((registro) => {
      const chave = `${registro.usuario_id || registro.nome}-${registro.data_iso}`

      if (!agrupado[chave]) {
        agrupado[chave] = criarLinhaJornada(registro)
      }

      preencherLinhaJornada(agrupado[chave], registro)
    })

  const linhas = Object.values(agrupado)
    .map((linha) => ({
      ...linha,
      status: statusLinhaJornada(linha),
    }))
    .filter((linha) => {
      if (inicioFiltro === null && fimFiltro === null) return true

      const horarios = [linha.entrada, linha.saidaAlmoco, linha.voltaAlmoco, linha.saida]
        .map((hora) => horaParaMinutos(hora))
        .filter((valor) => valor !== null)

      return horarios.some((minutos) => horarioDentroDoFiltro(minutos, inicioFiltro, fimFiltro))
    })
    .sort((a, b) => {
      const nomeComparacao = (a.nome || '').localeCompare(b.nome || '')
      if (nomeComparacao !== 0) return nomeComparacao

      return (a.data_iso || '').localeCompare(b.data_iso || '')
    })

  const funcionarios = {}

  linhas.forEach((linha) => {
    const chaveFuncionario = String(linha.usuario_id || linha.nome)

    if (!funcionarios[chaveFuncionario]) {
      funcionarios[chaveFuncionario] = {
        usuario_id: linha.usuario_id,
        nome: linha.nome,
        dias: [],
      }
    }

    funcionarios[chaveFuncionario].dias.push(linha)
  })

  return Object.values(funcionarios).map((funcionario) => ({
    ...funcionario,
    diasTrabalhados: funcionario.dias.length,
    pendentes: funcionario.dias.filter((dia) => dia.status !== 'Completo').length,
  }))
}

 function exportarRelatorioPDF() {

  const idEmpresaPDF = empresaSelecionada || usuarioLogado?.empresa_id

  const empresaAtual = empresas.find(
    (empresa) => empresa.id === idEmpresaPDF
  )

  const registros = gerarRelatorioDiarioOrganizado(idEmpresaPDF)

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
            <th>Localização</th>
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
        <td>${horaComVirada(r, 'saida')}</td>
        <td>${localizacaoParaHTML(r.ultimoPontoLocalizacao)}</td>
        <td>${r.status}</td>
      </tr>
    `
  })

  html += `

        </table>

        <div style="margin-top:25px;font-size:11px;color:#555;text-align:center;">
          Sistema auxiliar de organização interna de jornada. Não é REP/registrador eletrônico oficial e não substitui obrigações legais, fiscais, trabalhistas ou contábeis da empresa.
        </div>

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

function exportarRelatorioMensalPDF() {
  const idEmpresaPDF = empresaSelecionada || usuarioLogado?.empresa_id

  const empresaAtual = empresas.find(
    (empresa) => empresa.id === idEmpresaPDF
  )

  const funcionariosMensais = gerarRelatorioMensalOrganizado(idEmpresaPDF)

  const janela = window.open(
    '',
    '',
    'width=1000,height=700'
  )

  let html = `
    <html>
      <head>
        <title>Relatório Mensal de Ponto</title>
        <style>
          body{
            font-family:Arial;
            padding:30px;
          }

          h1,h2,h3{
            color:#001f6b;
          }

          h1,h2{
            text-align:center;
          }

          .funcionario{
            margin-top:30px;
            page-break-inside:avoid;
          }

          .resumo{
            margin-bottom:10px;
            color:#333;
            font-size:13px;
          }

          table{
            width:100%;
            border-collapse:collapse;
            margin-top:10px;
            font-size:12px;
          }

          th,td{
            border:1px solid #999;
            padding:8px;
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
        <h1>Relatório Mensal de Ponto</h1>
        <h2>${empresaAtual ? empresaAtual.nome : ''}</h2>
        <h2>${mesRelatorioMensal || ''}</h2>
  `

  if (funcionariosMensais.length === 0) {
    html += `
      <p>Nenhum registro encontrado para os filtros selecionados.</p>
    `
  }

  funcionariosMensais.forEach((funcionario) => {
    html += `
      <div class="funcionario">
        <h3>${funcionario.nome}</h3>
        <div class="resumo">
          Dias trabalhados: ${funcionario.diasTrabalhados} |
          Pendências: ${funcionario.pendentes}
        </div>

        <table>
          <tr>
            <th>Data</th>
            <th>Entrada</th>
            <th>Saída almoço</th>
            <th>Volta almoço</th>
            <th>Saída casa</th>
            <th>Localização</th>
            <th>Status</th>
          </tr>
    `

    funcionario.dias.forEach((dia) => {
      html += `
        <tr>
          <td>${dia.data}</td>
          <td>${dia.entrada || '-'}</td>
          <td>${dia.saidaAlmoco || '-'}</td>
          <td>${dia.voltaAlmoco || '-'}</td>
          <td>${horaComVirada(dia, 'saida')}</td>
          <td>${localizacaoParaHTML(dia.ultimoPontoLocalizacao)}</td>
          <td>${dia.status}</td>
        </tr>
      `
    })

    html += `
        </table>
      </div>
    `
  })

  html += `
        <div style="margin-top:25px;font-size:11px;color:#555;text-align:center;">
          Sistema auxiliar de organização interna de jornada. Não é REP/registrador eletrônico oficial e não substitui obrigações legais, fiscais, trabalhistas ou contábeis da empresa.
        </div>

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

  const avisoLegalStyle = {
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#7c2d12',
    padding: '16px',
    borderRadius: '18px',
    fontSize: '14px',
    lineHeight: '1.45',
    marginTop: '16px',
    textAlign: 'left',
  }

  const avisoLegalTexto = 'Sistema auxiliar de organização interna de registros de jornada. Este sistema não é REP, REP-C, REP-A ou REP-P oficial, não substitui obrigações trabalhistas, fiscais, contábeis ou legais da empresa e deve ser usado apenas como ferramenta de apoio administrativo. A responsabilidade pela conferência, uso dos dados, cumprimento da legislação, guarda de documentos e orientação jurídica/contábil é da empresa contratante.'


function obterProximoPontoFuncionario() {
  if (!usuarioLogado || usuarioLogado.tipo !== 'funcionario') return 'Registrar Ponto'

  const dataJornadaISO = obterDataJornadaISO(usuarioLogado.id, hojeISO(), horaAtual())

  const registrosJornada = pontos.filter(
    (p) =>
      p.usuario_id === usuarioLogado.id &&
      p.data_iso === dataJornadaISO
  )

  const entrada = registrosJornada.find((p) => p.tipo === 'Entrada')
  const saidaAlmoco = registrosJornada.find((p) => p.tipo === 'Saída Almoço')
  const voltaAlmoco = registrosJornada.find((p) => p.tipo === 'Volta Almoço')
  const saida = registrosJornada.find((p) => p.tipo === 'Saída')

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

  const dataJornadaISO = obterDataJornadaISO(usuarioLogado.id, hojeISO(), horaAtual())

  return pontos
    .filter(
      (p) =>
        p.usuario_id === usuarioLogado.id &&
        p.data_iso === dataJornadaISO
    )
    .map((p) => ({
      id: p.id,
      tipo: p.tipo,
      data: p.data,
      hora: formatarHoraServidor(p.registrado_em, p.hora),
      localizacao: obterLocalizacaoRegistro(p),
    }))
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
}


function abrirEdicaoMasterEmpresa(empresa) {

  setEmpresaEditandoMaster(empresa)

  setEditEmpresaNome(empresa.nome || '')

  setEditEmpresaEmailMaster(empresa.email_master || '')

  setEditEmpresaSenhaMaster(empresa.senha_master || '')

  setEditEmpresaAtiva(empresa.ativo !== false)

  mostrarMensagem(
    'Editando master da empresa: ' + empresa.nome
  )

}

function cancelarEdicaoMasterEmpresa() {

  setEmpresaEditandoMaster(null)

  setEditEmpresaNome('')

  setEditEmpresaEmailMaster('')

  setEditEmpresaSenhaMaster('')

  setEditEmpresaAtiva(true)

}

async function salvarEdicaoMasterEmpresa() {

  if (!empresaEditandoMaster) {
    mostrarMensagem('Nenhuma empresa selecionada para edição.')
    return
  }

  if (!editEmpresaNome || !editEmpresaEmailMaster || !editEmpresaSenhaMaster) {
    mostrarMensagem('Preencha nome, login master e senha master.')
    return
  }

  const { error } = await supabase
    .from('empresas')
    .update({
      nome: editEmpresaNome,
      email_master: editEmpresaEmailMaster.toLowerCase(),
      senha_master: editEmpresaSenhaMaster,
      ativo: editEmpresaAtiva,
    })
    .eq('id', empresaEditandoMaster.id)

  if (error) {
    mostrarMensagem('Erro ao alterar dados do master da empresa.')
    return
  }

  await carregarEmpresas()
  await registrarAuditoria('EDITAR_MASTER_EMPRESA', `Dados master alterados da empresa ${editEmpresaNome}.`)

  if (empresaSelecionada === empresaEditandoMaster.id && usuarioLogado?.tipo === 'programador') {
    setEmpresaSelecionada(empresaEditandoMaster.id)
  }

  cancelarEdicaoMasterEmpresa()

  mostrarMensagem('Dados do master da empresa alterados com sucesso.')
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
  await registrarAuditoria('EDITAR_FUNCIONARIO', `Funcionário alterado: ${editNome}.`)

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

            <p style={{ color: '#1d5fbf', fontSize: '14px', marginTop: '32px' }}>
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
              {mostrarAvisoLegalLogado && (
                <div style={{ ...avisoLegalStyle, marginTop: 0, marginBottom: '22px', position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarAvisoLegalLogado(false)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      border: 'none',
                      background: '#fed7aa',
                      color: '#7c2d12',
                      borderRadius: '999px',
                      padding: '6px 10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Li e concordo
                  </button>

                  <strong>Uso do sistema:</strong><br />
                  <span style={{ display: 'block', paddingRight: '76px' }}>
                    {avisoLegalTexto}
                  </span>
                </div>
              )}

              {mostrarTermoResponsabilidade && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.72)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '18px',
                  }}
                >
                  <div
                    style={{
                      background: '#ffffff',
                      width: '100%',
                      maxWidth: '720px',
                      borderRadius: '24px',
                      padding: '26px',
                      boxShadow: '0 30px 90px rgba(0,0,0,0.35)',
                      textAlign: 'left',
                      border: '1px solid #fed7aa',
                    }}
                  >
                    <h2 style={{ color: '#071638', marginTop: 0 }}>
                      Termo de responsabilidade e uso do sistema
                    </h2>

                    <div
                      style={{
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        color: '#7c2d12',
                        padding: '18px',
                        borderRadius: '18px',
                        lineHeight: '1.55',
                        fontSize: '15px',
                        marginBottom: '18px',
                      }}
                    >
                      <strong>Antes de continuar, leia e aceite:</strong>
                      <br />
                      {avisoLegalTexto}
                      <br /><br />
                      Ao clicar em <strong>Li e aceito os termos</strong>, o usuário declara ciência de que o sistema é apenas uma ferramenta auxiliar de organização interna, e que a responsabilidade pela conferência, guarda e uso legal dos dados é da empresa contratante.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={sair}
                        style={{
                          ...buttonStyle,
                          background: '#6b7280',
                          marginBottom: 0,
                        }}
                      >
                        Sair
                      </button>

                      <button
                        type="button"
                        onClick={aceitarTermoResponsabilidade}
                        style={{
                          ...buttonStyle,
                          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                          marginBottom: 0,
                        }}
                      >
                        Li e aceito os termos
                      </button>
                    </div>
                  </div>
                </div>
              )}


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
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <strong>{empresa.nome}</strong>
                            <br />
                            ID: {empresa.id}
                            <br />
                            Login Master: {empresa.email_master}
                            <br />
                            Senha Master: {empresa.senha_master}
                            <br />
                            Status: {empresa.ativo === false ? 'Inativa' : 'Ativa'}
                            <br />
                            <br />
                            <strong>Clique para ver funcionários, senhas e pontos</strong>
                          </div>

                          <button
                            style={{
                              ...buttonStyle,
                              width: '220px',
                              background: '#0f766e',
                              marginBottom: 0,
                              boxShadow: '0 10px 24px rgba(15, 118, 110, 0.22)',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              abrirEdicaoMasterEmpresa(empresa)
                            }}
                          >
                            Editar Master
                          </button>
                        </div>

                        {empresaEditandoMaster && empresaEditandoMaster.id === empresa.id && (
                          <div
                            style={{
                              background: '#eaf2ff',
                              padding: '20px',
                              borderRadius: '18px',
                              marginTop: '18px',
                              border: '1px solid #bfdbfe',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <h2 style={{ color: '#071638', marginTop: 0 }}>
                              Alterar Master da Empresa
                            </h2>

                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                              Nome da empresa
                            </label>
                            <input
                              style={inputStyle}
                              placeholder="Nome da empresa"
                              value={editEmpresaNome}
                              onChange={(e) => setEditEmpresaNome(e.target.value)}
                            />

                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                              Login / e-mail master
                            </label>
                            <input
                              style={inputStyle}
                              placeholder="Login ou e-mail master"
                              value={editEmpresaEmailMaster}
                              onChange={(e) => setEditEmpresaEmailMaster(e.target.value)}
                            />

                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                              Senha master
                            </label>
                            <input
                              style={inputStyle}
                              placeholder="Senha master"
                              value={editEmpresaSenhaMaster}
                              onChange={(e) => setEditEmpresaSenhaMaster(e.target.value)}
                            />

                            <label style={{ display: 'block', marginBottom: '20px' }}>
                              <input
                                type="checkbox"
                                checked={editEmpresaAtiva}
                                onChange={(e) => setEditEmpresaAtiva(e.target.checked)}
                              />
                              {' '}Empresa ativa
                            </label>

                            <button style={{ ...buttonStyle, background: '#16a34a' }} onClick={salvarEdicaoMasterEmpresa}>
                              Salvar Alterações do Master
                            </button>

                            <button style={{ ...buttonStyle, background: '#6b7280' }} onClick={cancelarEdicaoMasterEmpresa}>
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
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
                        <h2 style={{ color: '#071638', margin: 0 }}>Auditoria do Sistema</h2>
                        <p style={{ color: '#586174', margin: '6px 0 0' }}>
                          Área exclusiva do programador para acompanhar ações importantes do sistema.
                        </p>
                      </div>

                      <span style={chipStyle}>
                        {auditoriaFiltrada().length} registros
                      </span>
                    </div>

                    <button
                      style={{
                        ...buttonStyle,
                        background: mostrarAuditoria
                          ? '#6b7280'
                          : 'linear-gradient(180deg, #0b5cff 0%, #0046c7 100%)',
                      }}
                      onClick={() => setMostrarAuditoria(!mostrarAuditoria)}
                    >
                      {mostrarAuditoria ? '▲ Ocultar Auditoria' : '▼ Ver Auditoria do Sistema'}
                    </button>

                    {mostrarAuditoria && (
                      <>
                        <input
                          style={inputStyle}
                          placeholder="Pesquisar por usuário, ação, perfil, empresa ou detalhes"
                          value={buscaAuditoria}
                          onChange={(e) => setBuscaAuditoria(e.target.value)}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                              Data inicial
                            </label>
                            <input
                              type="date"
                              style={inputStyle}
                              value={dataInicioAuditoria}
                              onChange={(e) => setDataInicioAuditoria(e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
                              Data final
                            </label>
                            <input
                              type="date"
                              style={inputStyle}
                              value={dataFimAuditoria}
                              onChange={(e) => setDataFimAuditoria(e.target.value)}
                            />
                          </div>
                        </div>

                        <button style={{ ...buttonStyle, background: '#16a34a' }} onClick={exportarAuditoriaPDF}>
                          Exportar Auditoria em PDF
                        </button>

                        <div
                          style={{
                            maxHeight: '520px',
                            overflowY: 'auto',
                            paddingRight: '6px',
                            borderRadius: '18px',
                          }}
                        >
                          {auditoriaFiltrada().length === 0 ? (
                            <div style={cardStyle}>
                              Nenhum registro de auditoria encontrado.
                            </div>
                          ) : (
                            auditoriaFiltrada().map((item) => (
                              <div key={`auditoria-${item.id}`} style={cardStyle}>
                                <strong>{item.acao || 'Ação'}</strong>
                                <br />
                                Data/Hora: {item.criado_em ? new Date(item.criado_em).toLocaleString('pt-BR') : '-'}
                                <br />
                                Usuário: {item.usuario || '-'}
                                <br />
                                Perfil: {item.tipo_usuario || '-'}
                                <br />
                                Empresa ID: {item.empresa_id || '-'}
                                <br />
                                Detalhes: {item.detalhes || '-'}
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
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

                  {usuarioLogado.tipo === 'master' && (
                    <div style={sectionStyle}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <h2 style={{ color: '#071638', margin: 0 }}>Notificações no celular</h2>
                          <p style={{ color: '#586174', margin: '6px 0 0' }}>
                            Receba um aviso neste aparelho sempre que um funcionário registrar entrada, almoço, volta do almoço ou saída.
                          </p>
                        </div>

                        <span
                          style={{
                            ...chipStyle,
                            background: notificacoesPontoAtivas ? '#dcfce7' : '#fee2e2',
                            color: notificacoesPontoAtivas ? '#166534' : '#991b1b',
                          }}
                        >
                          {notificacoesPontoAtivas ? 'Ativado' : 'Desativado'}
                        </span>
                      </div>

                      <button
                        style={{
                          ...buttonStyle,
                          marginTop: '18px',
                          background: notificacoesPontoAtivas ? '#6b7280' : 'linear-gradient(135deg, #0b5cff 0%, #0046c7 100%)',
                        }}
                        onClick={alternarNotificacoesPonto}
                      >
                        {notificacoesPontoAtivas ? 'Desativar notificações' : 'Ativar notificações'}
                      </button>

                      <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                        Observação: as notificações funcionam quando o navegador permite notificações e o sistema está aberto ou ativo no aparelho.
                      </p>
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

                                    {u.ativo === false ? (
                                      <button style={{ ...buttonStyle, background: '#16a34a' }} onClick={() => reativarFuncionario(u.id)}>
                                        Reativar
                                      </button>
                                    ) : (
                                      <button style={{ ...buttonStyle, background: '#dc2626' }} onClick={() => excluirFuncionario(u.id)}>
                                        Bloquear
                                      </button>
                                    )}

                                    {usuarioLogado.tipo === 'programador' && (
                                      <button
                                        style={{ ...buttonStyle, background: '#7f1d1d' }}
                                        onClick={() => excluirFuncionarioDefinitivo(u.id)}
                                      >
                                        Excluir definitivamente
                                      </button>
                                    )}

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
                              .map((empresa) => {
                                const registrosDiarios = gerarRelatorioDiarioOrganizado(empresa.id)

                                return (
                                  <div key={empresa.id}>
                                    {usuarioLogado.tipo === 'programador' && (
                                      <h2 style={{ color: '#001f6b' }}>Empresa: {empresa.nome}</h2>
                                    )}

                                    {registrosDiarios.length === 0 ? (
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
                                        {registrosDiarios.map((r) => (
                                          <div key={`${empresa.id}-${r.usuario_id || r.nome}-${r.data_iso}`} style={cardStyle}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                                              <div>
                                                <strong>{r.nome}</strong>
                                                <br />
                                                Data: {r.data}
                                                <br />
                                                <span style={{ color: '#0757d8', fontWeight: 'bold' }}>
                                                  Último ponto: {r.ultimoPontoTipo || '-'} {r.ultimoPontoHora ? `às ${r.ultimoPontoHora}` : ''}
                                                </span>
                                                <br />
                                                {r.ultimoPontoLocalizacao?.link ? (
                                                  <a href={r.ultimoPontoLocalizacao.link} target="_blank" rel="noreferrer" style={{ color: '#0f766e', fontWeight: 'bold' }}>
                                                    📍 Ver localização do último ponto
                                                  </a>
                                                ) : (
                                                  <span style={{ color: '#991b1b' }}>📍 Localização não registrada</span>
                                                )}
                                              </div>
                                              <span
                                                style={{
                                                  ...chipStyle,
                                                  background: r.status === 'Completo' ? '#dcfce7' : '#fee2e2',
                                                  color: r.status === 'Completo' ? '#166534' : '#991b1b',
                                                }}
                                              >
                                                {r.status}
                                              </span>
                                            </div>

                                            <div
                                              style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                                gap: '10px',
                                                marginTop: '14px',
                                              }}
                                            >
                                              <div><strong>Entrada</strong><br />{r.entrada || '-'}</div>
                                              <div><strong>Saída almoço</strong><br />{r.saidaAlmoco || '-'}</div>
                                              <div><strong>Volta almoço</strong><br />{r.voltaAlmoco || '-'}</div>
                                              <div><strong>Saída casa</strong><br />{horaComVirada(r, 'saida')}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
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

                    {(usuarioLogado.tipo !== 'programador' || empresaSelecionada) && (
                      <button
                        style={{ ...buttonStyle, background: '#16a34a' }}
                        onClick={exportarRelatorioMensalPDF}
                      >
                        Exportar Relatório Mensal em PDF
                      </button>
                    )}

                    {mostrarRelatorioMensal && (
                      <>
                        {empresasVisiveis()
                          .filter((empresa) => (usuarioLogado.tipo === 'programador' ? empresa.id === empresaSelecionada : true))
                          .map((empresa) => {
                            const funcionariosMensais = gerarRelatorioMensalOrganizado(empresa.id)

                            return (
                              <div key={`mensal-${empresa.id}`}>
                                {usuarioLogado.tipo === 'programador' && (
                                  <h2 style={{ color: '#001f6b' }}>Empresa: {empresa.nome}</h2>
                                )}

                                {funcionariosMensais.length === 0 ? (
                                  <div style={cardStyle}>
                                    Nenhum registro encontrado para os filtros selecionados.
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      maxHeight: '620px',
                                      overflowY: 'auto',
                                      paddingRight: '6px',
                                      borderRadius: '18px',
                                    }}
                                  >
                                    {funcionariosMensais.map((funcionario) => (
                                      <div key={`mensal-${empresa.id}-${funcionario.usuario_id || funcionario.nome}`} style={cardStyle}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                                          <div>
                                            <strong style={{ fontSize: '18px' }}>{funcionario.nome}</strong>
                                            <br />
                                            <span style={{ color: '#586174' }}>
                                              Dias trabalhados: {funcionario.diasTrabalhados} • Pendências: {funcionario.pendentes}
                                            </span>
                                          </div>
                                          <span
                                            style={{
                                              ...chipStyle,
                                              background: funcionario.pendentes === 0 ? '#dcfce7' : '#fee2e2',
                                              color: funcionario.pendentes === 0 ? '#166534' : '#991b1b',
                                            }}
                                          >
                                            {funcionario.pendentes === 0 ? 'Tudo certo' : 'Verificar'}
                                          </span>
                                        </div>

                                        <div style={{ overflowX: 'auto', marginTop: '14px' }}>
                                          <table
                                            style={{
                                              width: '100%',
                                              borderCollapse: 'collapse',
                                              minWidth: '860px',
                                              fontSize: '14px',
                                            }}
                                          >
                                            <thead>
                                              <tr style={{ background: '#001f6b', color: '#fff' }}>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Data</th>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Entrada</th>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Saída almoço</th>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Volta almoço</th>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Saída casa</th>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Localização</th>
                                                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {funcionario.dias.map((dia) => (
                                                <tr key={`mensal-dia-${empresa.id}-${funcionario.usuario_id || funcionario.nome}-${dia.data_iso}`}>
                                                  <td style={{ padding: '10px', borderBottom: '1px solid #e6edf7' }}>{dia.data}</td>
                                                  <td style={{ padding: '10px', borderBottom: '1px solid #e6edf7' }}>{dia.entrada || '-'}</td>
                                                  <td style={{ padding: '10px', borderBottom: '1px solid #e6edf7' }}>{dia.saidaAlmoco || '-'}</td>
                                                  <td style={{ padding: '10px', borderBottom: '1px solid #e6edf7' }}>{dia.voltaAlmoco || '-'}</td>
                                                  <td style={{ padding: '10px', borderBottom: '1px solid #e6edf7' }}>{horaComVirada(dia, 'saida')}</td>
                                                  <td style={{ padding: '10px', borderBottom: '1px solid #e6edf7' }}>
                                                    {dia.ultimoPontoLocalizacao?.link ? (
                                                      <a href={dia.ultimoPontoLocalizacao.link} target="_blank" rel="noreferrer" style={{ color: '#0f766e', fontWeight: 'bold' }}>Ver mapa</a>
                                                    ) : (
                                                      'Não registrada'
                                                    )}
                                                  </td>
                                                  <td style={{ padding: '10px', borderBottom: '1px solid #e6edf7' }}>{dia.status}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
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
                          <br />
                          <span style={{ fontSize: '14px' }}>{textoStatusLocalizacao()}</span>
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

                    {!localizacaoAutorizada && (
                      <button
                        style={{
                          ...buttonStyle,
                          marginTop: '24px',
                          marginBottom: 0,
                          background: '#facc15',
                          color: '#713f12',
                          boxShadow: '0 14px 34px rgba(250, 204, 21, 0.22)',
                          opacity: solicitandoLocalizacao ? 0.75 : 1,
                        }}
                        onClick={verificarLocalizacaoFuncionario}
                        disabled={solicitandoLocalizacao}
                      >
                        {solicitandoLocalizacao ? 'Solicitando localização...' : 'Permitir localização para bater ponto'}
                      </button>
                    )}

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
                        opacity: registrandoPonto || !localizacaoAutorizada ? 0.65 : 1,
                      }}
                      onClick={registrarPonto}
                      disabled={registrandoPonto || !localizacaoAutorizada || obterProximoPontoFuncionario() === 'Jornada completa'}
                    >
                      {registrandoPonto ? 'Consultando horário e localização...' : !localizacaoAutorizada ? 'Libere a localização para bater ponto' : obterProximoPontoFuncionario() === 'Jornada completa' ? 'Jornada completa hoje' : 'Registrar Ponto'}
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
                            <br />
                            {registro.localizacao?.link ? (
                              <a href={registro.localizacao.link} target="_blank" rel="noreferrer" style={{ color: '#0f766e', fontWeight: 'bold' }}>
                                📍 Ver localização
                              </a>
                            ) : (
                              <span style={{ color: '#991b1b' }}>📍 Localização não registrada</span>
                            )}
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

        <div style={{ padding: usuarioLogado ? '0 20px 20px' : '0' }}>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '10px auto', maxWidth: '780px', lineHeight: '1.45' }}>
            Sistema auxiliar de organização interna. Não é ponto eletrônico oficial/REP e não substitui obrigações legais da empresa.
          </p>
          <p style={{ color: '#666', letterSpacing: '2px', fontSize: '11px', margin: 0 }}>
            DEVELOPED BY DINHO OLIVEIRA
          </p>
        </div>
      </div>
    </div>
  )
}

export default App