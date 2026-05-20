import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dgnktvvkgmgdcvswpqsw.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_JZRYoAFCE3c4g2c9qTfLBw_mrbo8Pas";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const EMPRESA_PRINCIPAL = "EIPO AUTOMACAO COMERCIAL";

const emptyEmpresa = {
  nome: "",
  cnpj: "",
  telefone: "",
  endereco: "",
};

const emptyFuncionario = {
  nome: "",
  cargo: "",
  senha: "",
  horario_entrada: "08:00",
  horario_saida: "18:00",
  intervalo_inicio: "12:00",
  intervalo_fim: "14:00",
  ativo: true,
};

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] =
    useState(null);

  const [funcionarios, setFuncionarios] = useState([]);
  const [registros, setRegistros] = useState([]);

  const [novaEmpresa, setNovaEmpresa] =
    useState(emptyEmpresa);

  const [novoFuncionario, setNovoFuncionario] =
    useState(emptyFuncionario);

  const [aba, setAba] = useState("funcionarios");

  const [relogioInternet, setRelogioInternet] =
    useState(new Date());

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const empresaAtual = useMemo(() => {
    if (!empresaSelecionada && empresas.length > 0) {
      return empresas[0];
    }

    return empresaSelecionada;
  }, [empresaSelecionada, empresas]);

  useEffect(() => {
    iniciarSistema();
  }, []);

  useEffect(() => {
    if (empresaAtual?.id) {
      carregarFuncionarios(empresaAtual.id);
      carregarRegistros(empresaAtual.id);
    }
  }, [empresaAtual?.id]);

  useEffect(() => {
    sincronizarRelogioInternet();

    const intervaloRelogio = setInterval(() => {
      setRelogioInternet((old) =>
        new Date(old.getTime() + 1000)
      );
    }, 1000);

    const intervaloSync = setInterval(() => {
      sincronizarRelogioInternet();
    }, 300000);

    return () => {
      clearInterval(intervaloRelogio);
      clearInterval(intervaloSync);
    };
  }, []);

  async function sincronizarRelogioInternet() {
    try {
      const resposta = await fetch(
        "https://worldtimeapi.org/api/timezone/America/Belem"
      );

      const dados = await resposta.json();

      if (dados?.datetime) {
        setRelogioInternet(new Date(dados.datetime));
      }
    } catch {
      setRelogioInternet(new Date());
    }
  }

  async function iniciarSistema() {
    setLoading(true);

    try {
      await garantirEmpresaPrincipal();
      await carregarEmpresas();
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function garantirEmpresaPrincipal() {
    const { data } = await supabase
      .from("empresas")
      .select("*")
      .eq("principal", true)
      .maybeSingle();

    if (!data) {
      await supabase.from("empresas").insert({
        nome: EMPRESA_PRINCIPAL,
        principal: true,
      });
    }
  }

  async function carregarEmpresas() {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("principal", {
        ascending: false,
      })
      .order("nome");

    if (error) {
      setErro(error.message);
      return;
    }

    setEmpresas(data || []);

    if (data?.length) {
      setEmpresaSelecionada(data[0]);
    }
  }

  async function carregarFuncionarios(empresaId) {
    const { data, error } = await supabase
      .from("funcionarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome");

    if (error) {
      setErro(error.message);
      return;
    }

    setFuncionarios(data || []);
  }

  async function carregarRegistros(empresaId) {
    const { data, error } = await supabase
      .from("registros_ponto")
      .select("*, funcionarios(nome)")
      .eq("empresa_id", empresaId)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (error) {
      setErro(error.message);
      return;
    }

    setRegistros(data || []);
  }

  async function cadastrarEmpresa(e) {
    e.preventDefault();

    if (!novaEmpresa.nome.trim()) {
      setErro("Digite o nome da empresa.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("empresas")
      .insert({
        nome: novaEmpresa.nome,
        cnpj: novaEmpresa.cnpj,
        telefone: novaEmpresa.telefone,
        endereco: novaEmpresa.endereco,
        principal: false,
      });

    setSaving(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setNovaEmpresa(emptyEmpresa);

    await carregarEmpresas();

    setMensagem("Empresa cadastrada.");
  }

  async function cadastrarFuncionario(e) {
    e.preventDefault();

    if (!empresaAtual?.id) {
      setErro("Selecione uma empresa.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("funcionarios")
      .insert({
        empresa_id: empresaAtual.id,
        nome: novoFuncionario.nome,
        cargo: novoFuncionario.cargo,
        senha: novoFuncionario.senha,
        horario_entrada:
          novoFuncionario.horario_entrada,
        horario_saida:
          novoFuncionario.horario_saida,
        intervalo_inicio:
          novoFuncionario.intervalo_inicio,
        intervalo_fim:
          novoFuncionario.intervalo_fim,
        ativo: true,
      });

    setSaving(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setNovoFuncionario(emptyFuncionario);

    await carregarFuncionarios(empresaAtual.id);

    setMensagem("Funcionário cadastrado.");
  }

  async function excluirFuncionario(id) {
    const confirmar = window.confirm(
      "Excluir funcionário?"
    );

    if (!confirmar) return;

    await supabase
      .from("funcionarios")
      .delete()
      .eq("id", id);

    await carregarFuncionarios(empresaAtual.id);
  }

  async function alternarAtivo(funcionario) {
    await supabase
      .from("funcionarios")
      .update({
        ativo: !funcionario.ativo,
      })
      .eq("id", funcionario.id);

    await carregarFuncionarios(empresaAtual.id);
  }

  async function baterPonto(funcionario, tipo) {
    await sincronizarRelogioInternet();

    const horarioAtual = new Date(
      relogioInternet.getTime() + 1000
    ).toISOString();

    const { error } = await supabase
      .from("registros_ponto")
      .insert({
        empresa_id: empresaAtual.id,
        funcionario_id: funcionario.id,
        tipo,
        data: todayISO(),
        horario: horarioAtual,
      });

    if (error) {
      setErro(error.message);
      return;
    }

    setMensagem(
      `${funcionario.nome} registrou ${tipo}`
    );

    await carregarRegistros(empresaAtual.id);
  }

  function selecionarEmpresa(empresa) {
    setEmpresaSelecionada(empresa);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 25,
          fontWeight: "bold",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: 20,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          background: "#111827",
          color: "white",
          padding: 20,
          borderRadius: 20,
          marginBottom: 20,
        }}
      >
        <h1>
          Controle de Ponto Biométrico
        </h1>

        <p>
          Horário sincronizado:
          {" "}
          {formatDateTime(relogioInternet)}
        </p>
      </div>

      {erro && (
        <div
          style={{
            background: "#fee2e2",
            padding: 12,
            borderRadius: 10,
            marginBottom: 10,
            color: "#991b1b",
            fontWeight: "bold",
          }}
        >
          {erro}
        </div>
      )}

      {mensagem && (
        <div
          style={{
            background: "#dcfce7",
            padding: 12,
            borderRadius: 10,
            marginBottom: 10,
            color: "#166534",
            fontWeight: "bold",
          }}
        >
          {mensagem}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 20,
        }}
      >
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 20,
          }}
        >
          <h2>Empresas</h2>

          <div
            style={{
              display: "grid",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {empresas.map((empresa) => (
              <button
                key={empresa.id}
                onClick={() =>
                  selecionarEmpresa(empresa)
                }
                onDoubleClick={() =>
                  selecionarEmpresa(empresa)
                }
                style={{
                  padding: 15,
                  borderRadius: 12,
                  border:
                    empresaAtual?.id === empresa.id
                      ? "2px solid #2563eb"
                      : "1px solid #d1d5db",
                  background:
                    empresaAtual?.id === empresa.id
                      ? "#eff6ff"
                      : "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <strong>
                  {empresa.nome}
                </strong>

                <br />

                <small>
                  {empresa.cnpj || "Sem CNPJ"}
                </small>
              </button>
            ))}
          </div>

          <form
            onSubmit={cadastrarEmpresa}
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <h3>Nova empresa</h3>

            <input
              placeholder="Nome"
              value={novaEmpresa.nome}
              onChange={(e) =>
                setNovaEmpresa({
                  ...novaEmpresa,
                  nome: e.target.value,
                })
              }
            />

            <input
              placeholder="CNPJ"
              value={novaEmpresa.cnpj}
              onChange={(e) =>
                setNovaEmpresa({
                  ...novaEmpresa,
                  cnpj: e.target.value,
                })
              }
            />

            <input
              placeholder="Telefone"
              value={novaEmpresa.telefone}
              onChange={(e) =>
                setNovaEmpresa({
                  ...novaEmpresa,
                  telefone: e.target.value,
                })
              }
            />

            <input
              placeholder="Endereço"
              value={novaEmpresa.endereco}
              onChange={(e) =>
                setNovaEmpresa({
                  ...novaEmpresa,
                  endereco: e.target.value,
                })
              }
            />

            <button
              style={{
                background: "#2563eb",
                color: "white",
                border: 0,
                padding: 12,
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {saving
                ? "Salvando..."
                : "Salvar empresa"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;