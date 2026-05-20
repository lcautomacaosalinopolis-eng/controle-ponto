function exportarRelatorioPDF() {

  const conteudo = document.getElementById(
    'area-relatorio-pdf'
  )

  const janela = window.open(
    '',
    '',
    'width=900,height=700'
  )

  janela.document.write(`
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

          h1{
            text-align:center;
            color:#001f6b;
          }

          .card{
            border:1px solid #ccc;
            border-radius:10px;
            padding:15px;
            margin-bottom:15px;
          }

        </style>

      </head>

      <body>

        <h1>
          Relatório de Ponto
        </h1>

        ${conteudo.innerHTML}

      </body>

    </html>
  `)

  janela.document.close()

  janela.focus()

  setTimeout(() => {
    janela.print()
  }, 500)
}<div id="area-relatorio-pdf">

{relatorio.map((r, index) => (

  <div
    key={index}
    className="card"
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