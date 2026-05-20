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
    const { data } = await supabase.from('usuarios').select('*')
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
      (u) => u.email === email && u.senha === senha
    )

    if (!usuario) {
      mostrarMensagem('E-mail ou senha incorretos.')
      return
    }

    if (usuario.ativo === false) {
      mostrarMensagem('Usuário bloqueado. Procure o gerente.')
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

    await supabase.from('usuarios').insert([
      {
        nome: novoNome,
        email: novoEmail,
        senha: novaSenha,
        tipo: 'funcionario',
        ativo: true,
      },
    ])

    setNovoNome('')
    setNovoEmail('')
    setNovaSenha('')

    await carregarUsuarios()
    mostrarMensagem('Funcionário cadastrado com sucesso.')
  }

  async function excluirFuncionario(id) {
    const confirmar = confirm('Deseja realmente excluir este funcionário?')
    if (!confirmar) return

    await supabase.from('usuarios').delete().eq('id', id)
    await carregarUsuarios()
    mostrarMensagem('Funcionário excluído com sucesso.')
  }

  async function registrarPonto() {
    const registrosHoje = pontos.filter(
      (p) =>
        p.usuario_id === usuarioLogado.id &&
        (p.data_iso === hojeISO() || p.data === hojeBR())
    )

    const ultimo = registrosHoje[0]?.tipo === 'Entrada' ? 'Saída' : 'Entrada'

    const { error } = await supabase.from('pontos').insert([
      {
        usuario_id: usuarioLogado.id,
        nome: usuarioLogado.nome,
        data: hojeBR(),
        data_iso: hojeISO(),
        hora: horaAtual(),
        tipo: ultimo,
        aparelho: navigator.userAgent,
      },
    ])

    if (error) {
      mostrarMensagem('Erro ao registrar ponto.')
      return
    }

    await carregarPontos()
    mostrarMensagem(`${ultimo} registrada com sucesso!`)
  }

  function gerarRelatorio() {
    const registros = pontos.filter((p) => {
      if (p.data_iso) return p.data_iso === dataRelatorio

      if (p.data && p.data.includes('/')) {
        const [dia, mes, ano] = p.data.split('/')
        return `${ano}-${mes}-${dia}` === dataRelatorio
      }

      return false
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

      if (r.tipo === 'Entrada') agrupado[r.nome].entrada = r.hora
      if (r.tipo === 'Saída') agrupado[r.nome].saida = r.hora
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
    const relatorio = gerarRelatorio()
    const janela = window.open('', '', 'width=900,height=700')

    let html = `
      <html>
        <head>
          <title>Relatório de Ponto</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { text-align: center; color: #001f6b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: center; }
            th { background: #001f6b; color: white; }
            .rodape { margin-top: 40px; text-align: center; font-size: 12px; color: #666; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <h1>Relatório de Ponto</h1>
          <table>
            <tr>
              <th>Funcionário</th>
              <th>Data</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Status</th>
            </tr>
    `

    relatorio.forEach((r) => {
      html += `
        <tr>
          <td>${r.nome}</td>
          <td>${r.data}</td>
          <td>${r.entrada}</td>
          <td>${r.saida}</td>
          <td>${r.status}</td>
        </tr>
      `
    })

    html += `
          </table>
          <div class="rodape">DEVELOPED BY DINHO OLIVEIRA</div>
        </body>
      </html>
    `

    janela.document.write(html)
    janela.document.close()
    janela.print()
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
            backgroundColor: '#001f6b',
            color: '#fff',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '25px',
            fontSize: '22px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
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
            Usuário logado: <strong>{usuarioLogado.nome}</strong>
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

              <button style={buttonStyle} onClick={cadastrarFuncionario}>
                Cadastrar
              </button>

              <h2>Funcionários</h2>

              {usuarios.map((u) => (
                <div
                  key={u.id}
                  style={{
                    background: '#f3f3f3',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '10px',
                  }}
                >
                  <strong>{u.nome}</strong>
                  <br />
                  E-mail: {u.email}
                  <br />
                  Senha: {u.senha}

                  <br />
                  <br />

                  <button
                    style={{ ...buttonStyle, backgroundColor: '#dc2626' }}
                    onClick={() => excluirFuncionario(u.id)}
                  >
                    Excluir
                  </button>
                </div>
              ))}

              <hr />

              <h2>Relatório</h2>

              <input
                type="date"
                style={inputStyle}
                value={dataRelatorio}
                onChange={(e) => setDataRelatorio(e.target.value)}
              />

              <button
                style={{ ...buttonStyle, backgroundColor: '#16a34a' }}
                onClick={exportarRelatorioPDF}
              >
                Exportar PDF
              </button>

              {relatorio.map((r, index) => (
                <div
                  key={index}
                  style={{
                    background: '#f3f3f3',
                    padding: '15px',
                    marginBottom: '10px',
                    borderRadius: '10px',
                    textAlign: 'left',
                  }}
                >
                  <strong>{r.nome}</strong>
                  <br />
                  Data: {r.data}
                  <br />
                  Entrada: {r.entrada}
                  <br />
                  Saída: {r.saida}
                  <br />
                  Status: {r.status}
                </div>
              ))}
            </>
          )}

          {usuarioLogado.tipo !== 'master' && (
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