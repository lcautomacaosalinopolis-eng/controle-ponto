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
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [dataRelatorio, setDataRelatorio] = useState(new Date().toISOString().split('T')[0])

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

    return () => supabase.removeChannel(canal)
  }, [])

  function mostrarMensagem(texto) {
    setMensagem(texto)
    setTimeout(() => setMensagem(''), 4000)
  }

  function hojeISO() {
    return new Date().toISOString().split('T')[0]
  }

  function hojeBR() {
    return new Date().toLocaleDateString('pt-BR')
  }

  function horaAtual() {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
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
    const registrosHoje = pontos.filter(
      (p) => p.usuario_id === usuarioLogado.id && p.data_iso === hojeISO()
    )

    const entrada = registrosHoje.find((p) => p.tipo === 'Entrada')
    const saida = registrosHoje.find((p) => p.tipo === 'Saída')

    if (entrada && saida) {
      mostrarMensagem('Você já registrou entrada e saída hoje.')
      return
    }

    const tipo = entrada ? 'Saída' : 'Entrada'

    const { error } = await supabase.from('pontos').insert([
      {
        usuario_id: usuarioLogado.id,
        empresa_id: usuarioLogado.empresa_id,
        nome: usuarioLogado.nome,
        data: hojeBR(),
        data_iso: hojeISO(),
        hora: horaAtual(),
        tipo,
      },
    ])

    if (error) {
      mostrarMensagem('Erro ao registrar ponto.')
      return
    }

    await carregarPontos()
    mostrarMensagem(`✅ ${tipo} registrada com sucesso!`)
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
    const idEmpresa = usuarioLogado?.tipo === 'programador' ? empresaSelecionada : empresaId

    const registros = pontos.filter((p) => {
      if (!idEmpresa) return false
      return p.data_iso === dataRelatorio && p.empresa_id === idEmpresa
    })

    const agrupado = {}

    registros.forEach((r) => {
      if (!agrupado[r.nome]) {
        agrupado[r.nome] = {
          entrada: '',
          saida: '',
          data: r.data,
        }
      }

      if (r.tipo === 'Entrada') {
        agrupado[r.nome].entrada = formatarHoraServidor(r.registrado_em, r.hora)
      }

      if (r.tipo === 'Saída') {
        agrupado[r.nome].saida = formatarHoraServidor(r.registrado_em, r.hora)
      }
    })

    return Object.keys(agrupado).map((nome) => ({
      nome,
      data: agrupado[nome].data,
      entrada: agrupado[nome].entrada,
      saida: agrupado[nome].saida,
      status:
        agrupado[nome].entrada && agrupado[nome].saida
          ? 'Completo'
          : 'Pendente',
    }))
  }

  function exportarRelatorioPDF() {
    window.print()
  }

  const containerStyle = {
    maxWidth: '1000px',
    margin: '40px auto',
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 0 20px rgba(0,0,0,0.1)',
    textAlign: 'center',
  }

  const inputStyle = {
    width: '100%',
    padding: '15px',
    marginBottom: '15px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    fontSize: '16px',
  }

  const buttonStyle = {
    padding: '15px 30px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#001f6b',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    marginBottom: '20px',
  }

  return (
    <div style={containerStyle}>
      {mensagem && (
        <div
          style={{
            background: '#16a34a',
            color: '#fff',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '20px',
            fontSize: '24px',
            fontWeight: 'bold',
          }}
        >
          {mensagem}
        </div>
      )}

      <h1 style={{ fontSize: '60px', color: '#0b1633' }}>
        Controle de Ponto
      </h1>

      {!usuarioLogado ? (
        <>
          <h2>Login do sistema</h2>

          <input style={inputStyle} placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />

          <input style={inputStyle} type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />

          <button style={buttonStyle} onClick={login}>
            Entrar
          </button>
        </>
      ) : (
        <>
          <h2>
            Usuário logado: <strong>{usuarioLogado.nome}</strong>
          </h2>

          {usuarioLogado.empresa_nome && <h3>Empresa: {usuarioLogado.empresa_nome}</h3>}

          <button style={buttonStyle} onClick={sair}>
            Sair
          </button>

          <hr />

          {usuarioLogado.tipo === 'programador' && (
            <>
              <h1 style={{ color: '#1d4ed8', marginTop: '40px' }}>
                Painel Programador / Multiempresas
              </h1>

              <h2>Criar Empresa</h2>

              <input style={inputStyle} placeholder="Nome da empresa" value={novaEmpresa} onChange={(e) => setNovaEmpresa(e.target.value)} />

              <input style={inputStyle} placeholder="E-mail master da empresa" value={emailMasterEmpresa} onChange={(e) => setEmailMasterEmpresa(e.target.value)} />

              <input style={inputStyle} placeholder="Senha master da empresa" value={senhaMasterEmpresa} onChange={(e) => setSenhaMasterEmpresa(e.target.value)} />

              <button style={buttonStyle} onClick={criarEmpresa}>
                Criar Empresa
              </button>

              <h1 style={{ color: '#1d4ed8', marginTop: '50px' }}>
                Empresas Cadastradas
              </h1>

              {empresas.map((empresa) => (
                <div
                  key={empresa.id}
                  onClick={() => setEmpresaSelecionada(empresa.id)}
                  style={{
                    background: empresaSelecionada === empresa.id ? '#dbeafe' : '#f3f3f3',
                    padding: '20px',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: empresaSelecionada === empresa.id ? '2px solid #1d4ed8' : '2px solid transparent',
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

              <hr />
            </>
          )}

          {(usuarioLogado.tipo === 'master' || usuarioLogado.tipo === 'programador') && (
            <>
              {(usuarioLogado.tipo === 'master' || (usuarioLogado.tipo === 'programador' && empresaSelecionada)) && (
                <>
                  <h2>Cadastrar Funcionário</h2>

                  <input style={inputStyle} placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />

                  <input style={inputStyle} placeholder="E-mail" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />

                  <input style={inputStyle} placeholder="Senha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />

                  <button style={buttonStyle} onClick={cadastrarFuncionario}>
                    Cadastrar
                  </button>
                </>
              )}

              <h1 style={{ color: '#1d4ed8', marginTop: '50px' }}>
                Funcionários
              </h1>

              {usuarioLogado.tipo === 'programador' && !empresaSelecionada && (
                <p>Clique em uma empresa para visualizar os funcionários.</p>
              )}

              {usuariosVisiveis()
                .filter((u) => u.tipo === 'funcionario')
                .map((u) => (
                  <div
                    key={u.id}
                    style={{
                      background: '#f3f3f3',
                      padding: '20px',
                      borderRadius: '10px',
                      marginBottom: '10px',
                    }}
                  >
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

                    <button style={{ ...buttonStyle, backgroundColor: '#dc2626' }} onClick={() => excluirFuncionario(u.id)}>
                      Excluir
                    </button>
                  </div>
                ))}

              <hr />

              <h1 style={{ color: '#1d4ed8', marginTop: '50px' }}>
                Relatório
              </h1>

              <input type="date" style={inputStyle} value={dataRelatorio} onChange={(e) => setDataRelatorio(e.target.value)} />

              <button style={{ ...buttonStyle, backgroundColor: '#16a34a' }} onClick={exportarRelatorioPDF}>
                Exportar PDF
              </button>

              {usuarioLogado.tipo === 'programador' && !empresaSelecionada && (
                <p>Clique em uma empresa para visualizar o relatório.</p>
              )}

              {empresasVisiveis()
                .filter((empresa) => (usuarioLogado.tipo === 'programador' ? empresa.id === empresaSelecionada : true))
                .map((empresa) => (
                  <div key={empresa.id}>
                    {usuarioLogado.tipo === 'programador' && (
                      <h2 style={{ color: '#001f6b' }}>Empresa: {empresa.nome}</h2>
                    )}

                    {gerarRelatorio(empresa.id).map((r, index) => (
                      <div
                        key={`${empresa.id}-${index}`}
                        style={{
                          background: '#f3f3f3',
                          padding: '20px',
                          borderRadius: '10px',
                          marginBottom: '10px',
                          textAlign: 'left',
                        }}
                      >
                        <strong>{r.nome}</strong>
                        <br />
                        Data: {r.data}
                        <br />
                        Entrada: {r.entrada || '-'}
                        <br />
                        Saída: {r.saida || '-'}
                        <br />
                        Status: {r.status}
                      </div>
                    ))}
                  </div>
                ))}
            </>
          )}

          {usuarioLogado.tipo === 'funcionario' && (
            <>
              <h1 style={{ color: '#001f6b', marginTop: '40px' }}>
                Registrar Ponto
              </h1>

              <button style={buttonStyle} onClick={registrarPonto}>
                Registrar Ponto
              </button>
            </>
          )}
        </>
      )}

      <br />
      <br />

      <p style={{ color: '#666', letterSpacing: '2px' }}>
        DEVELOPED BY DINHO OLIVEIRA
      </p>
    </div>
  )
}

export default App