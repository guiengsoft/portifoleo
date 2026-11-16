document.querySelectorAll(".foto img").forEach((img) => {
  const remover = () => img.remove();

  img.addEventListener("error", remover);

  if (img.complete && img.naturalWidth === 0) {
    remover();
  }
});

const ano = document.getElementById("ano");
if (ano) {
  ano.textContent = new Date().getFullYear();
}

const SUPABASE_URL = "https://cdqcamkwdfqgdqleqgbb.supabase.co";

const form = document.getElementById("form-contato");
const aviso = document.getElementById("form-aviso");

function mostrarAviso(texto, tipo) {
  aviso.textContent = texto;
  aviso.className = "aviso " + tipo;
}

if (form && aviso) {
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const botao = form.querySelector("button");
    const dados = Object.fromEntries(new FormData(form));

    botao.disabled = true;
    botao.textContent = "Enviando...";
    mostrarAviso("", "");

    try {
      const resposta = await fetch(`${SUPABASE_URL}/functions/v1/enviar-contato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      const resultado = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(resultado.erro || "Não foi possível enviar a mensagem.");
      }

      form.reset();
      mostrarAviso("Mensagem enviada com sucesso! Obrigado pelo contato.", "ok");
    } catch (erro) {
      mostrarAviso(erro.message, "erro");
    } finally {
      botao.disabled = false;
      botao.textContent = "Enviar mensagem";
    }
  });
}
