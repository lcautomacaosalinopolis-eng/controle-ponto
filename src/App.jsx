import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [usuarios, setUsuarios] = useState([])
  const [usuarioLogado, setUsuarioLogado] = useState(null)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  const [pontos, setPontos] = useState([])

  const [mensagem, setMensagem] = useState('')

  const [dataRelatorio, setDataRelatorio] = useState(
    new Date().toISOString().split('T')[0]
  )

  async function carregarUsuarios() {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('id')

    if (data) setUsuarios(data)
  }

  async function carregarPontos() {
    const { data } = await supabase
      .from('pontos')
      .select('*')
      .order('id', { ascending: false })

    if (data) setPontos(data)
  }

  useEffect(() => {
    carregarUsuarios()
    carregarPontos()

    const canal = supabase
      .channel('tempo-real')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pontos',
        },
        async () => {
          await carregarPontos()
        }
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usuarios',
        },
        async () => {
          await carregarUsuarios()
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  function mostrarMensagem(texto) {
    setMensagem(texto)

    setTimeout(() => {
      setMensagem('')
    }, 4000)
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

  async function login() {
    if (email === 'master@empresa.com' && senha === 'pontoemp01') {
      setUsuarioLogado({
        nome: 'MASTER',
        tipo: 'master',
        email,
      })

      return
    }

    const usuario = usuarios.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.senha === senha
    )

    if (!usuario) {
      mostrarMensagem('Usuário não encontrado.')
      return
    }

    setUsuarioLogado(usuario)
  }

  function sair() {
    setUsuarioLogado(null)
  }

  async function cadastrarFuncionario() {
    if (!novoNome || !novoEmail || !novaSenha) {
      mostrarMensagem('Preencha todos os campos.')
      return
    }

    const { error } = await supabase.from('usuarios').insert([
      {
        nome: novoNome,
        email: novoEmail,
        senha: novaSenha,
        tipo: 'funcionario',
      },
    ])

    if (error) {
      mostrarMensagem('Erro ao cadastrar funcionário.')
      return
    }

    setNovoNome('')
    setNovoEmail('')
    setNovaSenha('')

    carregarUsuarios()

    mostrarMensagem('Funcionário cadastrado com sucesso!')
  }

  async function excluirFuncionario(id) {
    const confirmar = confirm(
      'Deseja realmente excluir este funcionário?'
    )

    if (!confirmar) return

    await supabase.from('usuarios').delete().eq('id', id)

    carregarUsuarios()

    mostrarMensagem('Funcionário excluído.')
  }

  async function registrarPonto() {
    const registrosHoje = pontos.filter(
      (p) =>
        p.usuario_id === usuarioLogado.id &&
        p.data_iso === hojeISO()
    )

    const entrada = registrosHoje.find(
      (p) => p.tipo === 'Entrada'
    )

    const saida = registrosHoje.find(
      (p) => p.tipo === 'Saída'
    )

    if (entrada && saida) {
      mostrarMensagem(
        'Você já registrou entrada e saída hoje.'
      )
      return
    }

    const tipo = entrada ? 'Saída' : 'Entrada'

    const { error } = await supabase.from('pontos').insert([
      {
        usuario_id: usuarioLogado.id,
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

  function gerarRelatorio() {
    const registros = pontos.filter(
      (p) => p.data_iso === dataRelatorio
    )

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
        agrupado[r.nome].entrada = r.hora
      }

      if (r.tipo === 'Saída') {
        agrupado[r.nome].saida = r.hora
      }
    })

    return Object.keys(agrupado).map((nome) => ({
      nome,
      data: agrupado[nome].data,
      entrada: agrupado[nome].entrada,
      saida: agrupado[nome].saida,
      status:
        agrupado[nome].entrada &&
        agrupado[nome].saida
          ? 'Completo'
          : 'Pendente',
    }))
  }

  function exportarRelatorioPDF() {
    window.print()
  }

  const relatorio = gerarRelatorio()

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

      <h1
        style={{
          fontSize: '60px',
          color: '#0b1633',
        }}
      >
        Controle de Ponto
      </h1>

      {!usuarioLogado ? (
        <>
          <h2>Login do sistema</h2>

          <input
            style={inputStyle}
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={inputStyle}
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          <button style={buttonStyle} onClick={login}>
            Entrar
          </button>
        </>
      ) : (
        <>
          <h2>
            Usuário logado:{' '}
            <strong>{usuarioLogado.nome}</strong>
          </h2>

          <button style={buttonStyle} onClick={sair}>
            Sair
          </button>

          <hr />

          {usuarioLogado.tipo === 'master' && (
            <>
              <h2>Cadastrar Funcionário</h2>

              <input
                style={inputStyle}
                placeholder="Nome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />

              <input
                style={inputStyle}
                placeholder="E-mail"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
              />

              <input
                style={inputStyle}
                placeholder="Senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />

              <button
                style={buttonStyle}
                onClick={cadastrarFuncionario}
              >
                Cadastrar
              </button>

              <h1
                style={{
                  color: '#1d4ed8',
                  marginTop: '50px',
                }}
              >
                Funcionários
              </h1>

              {usuarios.map((u) => (
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

                  {u.email}

                  <br />

                  Senha: {u.senha}

                  <br />
                  <br />

                  <button
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#dc2626',
                    }}
                    onClick={() =>
                      excluirFuncionario(u.id)
                    }
                  >
                    Excluir
                  </button>
                </div>
              ))}

              <hr />

              <h1
                style={{
                  color: '#1d4ed8',
                  marginTop: '50px',
                }}
              >
                Relatório
              </h1>

              <input
                type="date"
                style={inputStyle}
                value={dataRelatorio}
                onChange={(e) =>
                  setDataRelatorio(e.target.value)
                }
              />

              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: '#16a34a',
                }}
                onClick={exportarRelatorioPDF}
              >
                Exportar PDF
              </button>

              {relatorio.map((r, index) => (
                <div
                  key={index}
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
            </>
          )}

          {usuarioLogado.tipo !== 'master' && (
            <>
              <h1
                style={{
                  color: '#001f6b',
                  marginTop: '40px',
                }}
              >
                Registrar Ponto
              </h1>

              <button
                style={buttonStyle}
                onClick={registrarPonto}
              >
                Registrar Ponto
              </button>
            </>
          )}
        </>
      )}

      <br />
      <br />

      <p
        style={{
          color: '#666',
          letterSpacing: '2px',
        }}
      >
        DEVELOPED BY DINHO OLIVEIRA
      </p>
    </div>
  )
}

export default App