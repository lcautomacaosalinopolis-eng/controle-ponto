import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [carregando, setCarregando] = useState(true)
  const [usuarioLogado, setUsuarioLogado] = useState(null)
  const [emailLogin, setEmailLogin] = useState('')
  const [senhaLogin, setSenhaLogin] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [pontos, setPontos] = useState([])

  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  const [dataRelatorio, setDataRelatorio] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const { data: usuariosData, error: erroUsuarios } = await supabase
      .from('usuarios')
      .select('*')
      .order('id', { ascending: true })

    const { data: pontosData, error: erroPontos } = await supabase
      .from('pontos')
      .select('*')
      .order('id', { ascending: true })

    if (erroUsuarios || erroPontos) {
      alert('Erro ao carregar dados do Supabase.')
      console.log(erroUsuarios || erroPontos)
      setCarregando(false)
      return
    }

    setUsuarios(usuariosData || [])
    setPontos(pontosData || [])
    setCarregando(false)
  }

  function hojeBrasil() {
    return new Date().toLocaleDateString('pt-BR')
  }

  function hojeISO() {
    return new Date().toISOString().split('T')[0]
  }

  function inputParaBrasil(dataInput) {
    if (!dataInput) return hojeBrasil()
    const [ano, mes, dia] = dataInput.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function horaAtual() {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function aparelhoAtual() {
    return navigator.userAgent || 'Dispositivo não identificado'
  }

  function pontosHojeDoUsuario(usuarioId) {
    return pontos.filter(
      (ponto) => ponto.usuario_id === usuarioId && ponto.data_iso === hojeISO()
    )
  }

  function proximoTipoPonto(usuarioId) {
    const registros = pontosHojeDoUsuario(usuarioId)
    const temEntrada = registros.some((ponto) => ponto.tipo === 'Entrada')
    const temSaida = registros.some((ponto) => ponto.tipo === 'Saída')

    if (!temEntrada) return 'Entrada'
    if (!temSaida) return 'Saída'
    return 'Completo'
  }

  function fazerLogin() {
    const usuario = usuarios.find(
      (u) =>
        u.email.toLowerCase() === emailLogin.trim().toLowerCase() &&
        u.senha === senhaLogin.trim()
    )

    if (!usuario) {
      alert('E-mail ou senha incorretos.')
      return
    }

    if (usuario.ativo === false) {
      alert('Usuário bloqueado. Procure o gerente/master.')
      return
    }

    setUsuarioLogado(usuario)
    setEmailLogin('')
    setSenhaLogin('')
  }

  function sair() {
    setUsuarioLogado(null)
  }

  async function registrarPonto() {
    if (!usuarioLogado || usuarioLogado.tipo !== 'funcionario') {
      alert('Somente funcionários podem bater ponto.')
      return
    }

    const tipo = proximoTipoPonto(usuarioLogado.id)

    if (tipo === 'Completo') {
      alert('Entrada e saída já foram registradas hoje.')
      return
    }

    const novoPonto = {
      usuario_id: usuarioLogado.id,
      nome: usuarioLogado.nome,
      data: hojeBrasil(),
      data_iso: hojeISO(),
      hora: horaAtual(),
      tipo,
      aparelho: aparelhoAtual(),
    }

    const { error } = await supabase.from('pontos').insert([novoPonto])

    if (error) {
      alert('Erro ao salvar ponto no banco online.')
      console.log(error)
      return
    }

    await carregarDados()
    alert(`${tipo} registrada com sucesso às ${novoPonto.hora}`)
  }

  async function criarFuncionario() {
    if (!novoNome.trim() || !novoEmail.trim() || !novaSenha.trim()) {
      alert('Preencha nome, e-mail e senha.')
      return
    }

    const emailExiste = usuarios.some(
      (usuario) =>
        usuario.email.toLowerCase() === novoEmail.trim().toLowerCase()
    )

    if (emailExiste) {
      alert('Este e-mail já está cadastrado.')
      return
    }

    const novoFuncionario = {
      nome: novoNome.trim(),
      email: novoEmail.trim().toLowerCase(),
      senha: novaSenha.trim(),
      tipo: 'funcionario',
      ativo: true,
    }

    const { error } = await supabase.from('usuarios').insert([novoFuncionario])

    if (error) {
      alert('Erro ao criar funcionário.')
      console.log(error)
      return
    }

    setNovoNome('')
    setNovoEmail('')
    setNovaSenha('')
    await carregarDados()
    alert('Funcionário criado com sucesso!')
  }

  async function alterarStatusFuncionario(usuario) {
    const novoStatus = !usuario.ativo

    const confirmar = window.confirm(
      novoStatus
        ? `Deseja liberar o acesso de ${usuario.nome}?`
        : `Deseja bloquear o acesso de ${usuario.nome}?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('usuarios')
      .update({ ativo: novoStatus })
      .eq('id', usuario.id)
      .eq('tipo', 'funcionario')

    if (error) {
      alert('Erro ao alterar status do funcionário.')
      console.log(error)
      return
    }

    await carregarDados()
    alert(novoStatus ? 'Funcionário liberado.' : 'Funcionário bloqueado.')
  }

  function gerarRelatorio() {
    return usuarios
      .filter((usuario) => usuario.tipo === 'funcionario')
      .map((usuario) => {
        const registros = pontos.filter(
          (ponto) =>
            ponto.usuario_id === usuario.id && ponto.data_iso === dataRelatorio
        )

        const entrada = registros.find((ponto) => ponto.tipo === 'Entrada')
        const saida = [...registros].reverse().find((ponto) => ponto.tipo === 'Saída')

        return {
          id: usuario.id,
          nome: usuario.nome,
          data: inputParaBrasil(dataRelatorio),
          entrada: entrada ? entrada.hora : '-',
          saida: saida ? saida.hora : '-',
          status: usuario.ativo === false ? 'Bloqueado' : 'Ativo',
        }
      })
  }

  const proximoPonto =
    usuarioLogado?.tipo === 'funcionario'
      ? proximoTipoPonto(usuarioLogado.id)
      : ''

  const inputStyle = {
    width: '100%',
    padding: '14px',
    marginBottom: '15px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '16px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    outline: 'none',
  }

  const buttonStyle = {
    backgroundColor: '#001b5e',
    color: '#ffffff',
    border: 'none',
    padding: '15px 28px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
  }

  const thTdStyle = {
    padding: '15px',
    border: '1px solid #cbd5e1',
    textAlign: 'center',
  }

  if (carregando) {
    return (
      <div className="app-container">
        <main className="app-card">
          <h1>Controle de Ponto</h1>
          <p>Carregando sistema...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="app-container">
      <main className="app-card">
        <h1>Controle de Ponto</h1>

        {!usuarioLogado ? (
          <>
            <p className="subtitle">Login do sistema</p>

            <div className="form-area">
              <input
                style={inputStyle}
                placeholder="E-mail"
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
              />

              <input
                style={inputStyle}
                placeholder="Senha"
                type="password"
                value={senhaLogin}
                onChange={(e) => setSenhaLogin(e.target.value)}
              />

              <button style={buttonStyle} onClick={fazerLogin}>
                Entrar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="subtitle">
              Usuário logado: <strong>{usuarioLogado.nome}</strong>
            </p>

            <button
              onClick={sair}
              style={{
                ...buttonStyle,
                backgroundColor: '#64748b',
                marginBottom: '30px',
              }}
            >
              Sair
            </button>

            <hr />

            {usuarioLogado.tipo === 'funcionario' && (
              <section className="section-area">
                <h2>Registrar Ponto</h2>

                <p className="subtitle">
                  Próximo registro:{' '}
                  <strong>
                    {proximoPonto === 'Completo'
                      ? 'Entrada e saída já registradas hoje'
                      : proximoPonto}
                  </strong>
                </p>

                <button
                  style={{
                    ...buttonStyle,
                    opacity: proximoPonto === 'Completo' ? 0.6 : 1,
                    cursor: proximoPonto === 'Completo' ? 'not-allowed' : 'pointer',
                  }}
                  onClick={registrarPonto}
                  disabled={proximoPonto === 'Completo'}
                >
                  {proximoPonto === 'Completo'
                    ? 'Ponto Completo Hoje'
                    : `Registrar ${proximoPonto}`}
                </button>
              </section>
            )}

            {usuarioLogado.tipo === 'master' && (
              <section className="section-area">
                <h2>Área Master / Gerente</h2>

                <div className="form-area">
                  <h3>Criar Funcionário</h3>

                  <input
                    style={inputStyle}
                    placeholder="Nome do funcionário"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                  />

                  <input
                    style={inputStyle}
                    placeholder="E-mail do funcionário"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                  />

                  <input
                    style={inputStyle}
                    placeholder="Senha inicial"
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                  />

                  <button style={buttonStyle} onClick={criarFuncionario}>
                    Criar Funcionário
                  </button>
                </div>

                <h3 className="report-title">Funcionários Cadastrados</h3>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th style={thTdStyle}>Funcionário</th>
                        <th style={thTdStyle}>E-mail</th>
                        <th style={thTdStyle}>Status</th>
                        <th style={thTdStyle}>Ação</th>
                      </tr>
                    </thead>

                    <tbody>
                      {usuarios
                        .filter((usuario) => usuario.tipo === 'funcionario')
                        .map((usuario) => (
                          <tr key={usuario.id}>
                            <td style={thTdStyle}>{usuario.nome}</td>
                            <td style={thTdStyle}>{usuario.email}</td>
                            <td style={thTdStyle}>
                              {usuario.ativo === false ? 'Bloqueado' : 'Ativo'}
                            </td>
                            <td style={thTdStyle}>
                              <button
                                onClick={() => alterarStatusFuncionario(usuario)}
                                style={{
                                  ...buttonStyle,
                                  backgroundColor:
                                    usuario.ativo === false ? '#16a34a' : '#dc2626',
                                  padding: '10px 18px',
                                }}
                              >
                                {usuario.ativo === false ? 'Liberar' : 'Bloquear'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <h3 className="report-title">Relatório Diário de Ponto</h3>

                <div className="form-area">
                  <label className="label-date">Escolher data do relatório</label>

                  <input
                    type="date"
                    style={inputStyle}
                    value={dataRelatorio}
                    onChange={(e) => setDataRelatorio(e.target.value)}
                  />
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th style={thTdStyle}>Funcionário</th>
                        <th style={thTdStyle}>Data</th>
                        <th style={thTdStyle}>Entrada</th>
                        <th style={thTdStyle}>Saída</th>
                        <th style={thTdStyle}>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {gerarRelatorio().map((linha) => (
                        <tr key={linha.id}>
                          <td style={thTdStyle}>{linha.nome}</td>
                          <td style={thTdStyle}>{linha.data}</td>
                          <td style={thTdStyle}>{linha.entrada}</td>
                          <td style={thTdStyle}>{linha.saida}</td>
                          <td style={thTdStyle}>{linha.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <footer>DEVELOPED BY DINHO OLIVEIRA</footer>
      </main>
    </div>
  )
}

export default App