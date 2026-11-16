
const API = "/api";

const TAXA_ENTREGA = 5;

let produtos = [];
let categoriaAtual = "Todos";

// =================================
// FUNÇÕES AUXILIARES
// =================================

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function obterCarrinho() {
    return JSON.parse(localStorage.getItem("carrinho")) || [];
}

function salvarCarrinho(carrinho) {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

// =================================
// CARREGAR PRODUTOS DA API
// =================================

async function carregarProdutos() {
    try {
        const resposta = await fetch(`${API}/produtos`);

        if (!resposta.ok) {
            throw new Error("Erro ao carregar produtos");
        }

        produtos = await resposta.json();

        mostrarProdutos();
        mostrarDestaques();

    } catch (erro) {
        console.error(erro);

        let lista = document.getElementById("lista-produtos");

        if (lista) {
            lista.innerHTML =
                '<p class="vazio">Não foi possível carregar o cardápio.</p>';
        }
    }
}

// =================================
// MOSTRAR PRODUTOS
// =================================

function criarCard(produto) {
    const imagem = produto.imagem || "";

    return `
        <article class="produto">

            <img
                src="${escaparHTML(imagem)}"
                alt="${escaparHTML(produto.nome)}"
                onerror="this.style.display='none'"
            >

            <div class="produto-info">

                <h3>${escaparHTML(produto.nome)}</h3>

                <p>${escaparHTML(produto.descricao || "")}</p>

                <span class="preco">
                    ${formatarMoeda(produto.preco)}
                </span>

                <button
                    class="btn"
                    onclick="adicionarCarrinho(${produto.id})"
                >
                    + Adicionar
                </button>

            </div>
        </article>
    `;
}

function mostrarProdutos() {
    const lista = document.getElementById("lista-produtos");

    if (!lista) return;

    const pesquisa = document
        .getElementById("pesquisa")
        .value.toLowerCase();

    const filtrados = produtos.filter(produto => {
        const correspondeCategoria =
            categoriaAtual === "Todos" ||
            produto.categoria === categoriaAtual;

        const correspondePesquisa =
            produto.nome.toLowerCase().includes(pesquisa);

        return correspondeCategoria && correspondePesquisa;
    });

    lista.innerHTML = filtrados.length
        ? filtrados.map(criarCard).join("")
        : '<p class="vazio">Nenhum produto encontrado.</p>';
}

// =================================
// PRODUTOS EM DESTAQUE
// =================================

function mostrarDestaques() {
    const destaque = document.getElementById("produtos-destaque");

    if (!destaque) return;

    destaque.innerHTML = produtos
        .slice(0, 4)
        .map(criarCard)
        .join("");
}

// =================================
// FILTRAR CATEGORIAS
// =================================

function filtrarCategoria(categoria) {
    categoriaAtual = categoria;
    mostrarProdutos();
}

// =================================
// ADICIONAR AO CARRINHO
// =================================

function adicionarCarrinho(id) {
    const produto = produtos.find(item => item.id === id);

    if (!produto) return;

    const carrinho = obterCarrinho();

    const item = carrinho.find(item => item.id === id);

    if (item) {
        item.quantidade++;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: Number(produto.preco),
            quantidade: 1
        });
    }

    salvarCarrinho(carrinho);

    alert("Produto adicionado ao carrinho!");
}

// =================================
// ALTERAR QUANTIDADE
// =================================

function alterarQuantidade(id, alteracao) {
    let carrinho = obterCarrinho();

    const item = carrinho.find(produto => produto.id === id);

    if (!item) return;

    item.quantidade += alteracao;

    if (item.quantidade <= 0) {
        carrinho = carrinho.filter(produto => produto.id !== id);
    }

    salvarCarrinho(carrinho);
    mostrarCarrinho();
}

// =================================
// REMOVER PRODUTO
// =================================

function removerProduto(id) {
    const carrinho = obterCarrinho();

    const novoCarrinho = carrinho.filter(
        produto => produto.id !== id
    );

    salvarCarrinho(novoCarrinho);
    mostrarCarrinho();
}

// =================================
// MOSTRAR CARRINHO
// =================================

function mostrarCarrinho() {
    const lista = document.getElementById("itens-carrinho");

    if (!lista) return;

    const carrinho = obterCarrinho();

    if (carrinho.length === 0) {
        lista.innerHTML =
            '<p class="vazio">Seu carrinho está vazio.</p>';
    } else {
        lista.innerHTML = carrinho.map(item => `
            <div class="item-carrinho">

                <div>
                    <h3>${escaparHTML(item.nome)}</h3>
                    <p>${formatarMoeda(item.preco)}</p>
                </div>

                <div class="controles">

                    <button onclick="alterarQuantidade(${item.id}, -1)">
                        -
                    </button>

                    <strong>${item.quantidade}</strong>

                    <button onclick="alterarQuantidade(${item.id}, 1)">
                        +
                    </button>

                    <button
                        class="remover"
                        onclick="removerProduto(${item.id})"
                    >
                        Remover
                    </button>

                </div>

                <strong>
                    ${formatarMoeda(item.preco * item.quantidade)}
                </strong>

            </div>
        `).join("");
    }

    calcularTotal();
}

// =================================
// CALCULAR VALORES
// =================================

function calcularSubtotal() {
    return obterCarrinho().reduce((total, item) => {
        return total + item.preco * item.quantidade;
    }, 0);
}

function calcularTotal() {
    const subtotal = calcularSubtotal();

    const campoRecebimento = document.getElementById("recebimento");

const entrega = campoRecebimento
    ? (campoRecebimento.value === "Entrega" ? TAXA_ENTREGA : 0)
    : (document.getElementById("itens-carrinho") ? TAXA_ENTREGA : 0);
    const total = subtotal + entrega;

    const campoSubtotal = document.getElementById("subtotal");
    const campoEntrega = document.getElementById("entrega");
    const campoTotal = document.getElementById("total");
    const campoCheckout = document.getElementById("total-checkout");

    if (campoSubtotal) {
        campoSubtotal.textContent = formatarMoeda(subtotal);
    }

    if (campoEntrega) {
        campoEntrega.textContent = formatarMoeda(entrega);
    }

    if (campoTotal) {
        campoTotal.textContent = formatarMoeda(total);
    }

    if (campoCheckout) {
        campoCheckout.textContent = formatarMoeda(total);
    }

    atualizarPix();
    atualizarParcelamento();
    return total;
}

// =================================
// FORMA DE RECEBIMENTO
// =================================

function configurarRecebimento() {
    const recebimento = document.getElementById("recebimento");
    const endereco = document.getElementById("endereco");
    const campoEndereco = document.getElementById("campo-endereco");

    if (!recebimento || !endereco || !campoEndereco) return;

    function atualizarEndereco() {
        const entrega = recebimento.value === "Entrega";

        campoEndereco.style.display = entrega ? "block" : "none";
        endereco.required = entrega;

        calcularTotal();
    }

    recebimento.addEventListener("change", atualizarEndereco);

    atualizarEndereco();
}

// =================================
// PIX (DEMONSTRACAO)
// =================================

function obterChavePixSimulada() {
    let chave = localStorage.getItem("esquina_sabor_pix_demo");

    if (chave) return chave;

    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        chave = window.crypto.randomUUID();
    } else {
        const bytes = new Uint8Array(16);

        if (window.crypto && typeof window.crypto.getRandomValues === "function") {
            window.crypto.getRandomValues(bytes);
        } else {
            for (let i = 0; i < bytes.length; i++) {
                bytes[i] = Math.floor(Math.random() * 256);
            }
        }

        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
        chave = [
            hex.slice(0, 4).join(""),
            hex.slice(4, 6).join(""),
            hex.slice(6, 8).join(""),
            hex.slice(8, 10).join(""),
            hex.slice(10, 16).join("")
        ].join("-");
    }

    localStorage.setItem("esquina_sabor_pix_demo", chave);
    return chave;
}

function atualizarPix() {
    const pagamento = document.getElementById("pagamento");
    const areaPix = document.getElementById("pix-area");

    if (!pagamento || !areaPix) return;

    const pixSelecionado = pagamento.value === "Pix";
    areaPix.hidden = !pixSelecionado;

    if (!pixSelecionado) return;

    const chave = obterChavePixSimulada();
    const campoChave = document.getElementById("pix-chave");
    const campoValor = document.getElementById("pix-valor");
    const areaQRCode = document.getElementById("pix-qrcode");

    if (campoChave) campoChave.value = chave;

    const recebimento = document.getElementById("recebimento");
    const taxa = recebimento && recebimento.value === "Entrega" ? TAXA_ENTREGA : 0;
    const total = calcularSubtotal() + taxa;

    if (campoValor) campoValor.textContent = formatarMoeda(total);
    if (!areaQRCode) return;

    const conteudoQRCode = [
        "PIX DE DEMONSTRACAO - ESQUINA DO SABOR",
        `Chave aleatoria: ${chave}`,
        `Valor: ${formatarMoeda(total)}`
    ].join("\n");

    if (areaQRCode.dataset.conteudo === conteudoQRCode) return;

    areaQRCode.dataset.conteudo = conteudoQRCode;
    areaQRCode.innerHTML = "";

    if (typeof QRCode === "undefined") {
        areaQRCode.textContent = "O gerador do QR Code não carregou. Verifique a conexão com a internet e recarregue a página.";
        return;
    }

    new QRCode(areaQRCode, {
        text: conteudoQRCode,
        width: 190,
        height: 190,
        colorDark: "#17212b",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}

async function copiarChavePix() {
    const campoChave = document.getElementById("pix-chave");
    if (!campoChave || !campoChave.value) return;

    try {
        await navigator.clipboard.writeText(campoChave.value);
        alert("Chave Pix de demonstração copiada!");
    } catch (erro) {
        campoChave.focus();
        campoChave.select();
        const copiou = document.execCommand("copy");
        alert(copiou ? "Chave Pix copiada!" : "Selecione e copie a chave manualmente.");
    }
}

function configurarPix() {
    const pagamento = document.getElementById("pagamento");
    if (!pagamento) return;

    pagamento.addEventListener("change", atualizarPix);
    atualizarPix();
}

// =================================
// PARCELAMENTO DO CARTAO (DEMONSTRACAO)
// =================================

function distribuirParcelas(total, quantidade) {
    const totalCentavos = Math.max(0, Math.round(Number(total) * 100));
    const base = Math.floor(totalCentavos / quantidade);
    const centavosExtras = totalCentavos % quantidade;

    // Distribui os centavos restantes nas primeiras parcelas para que
    // a soma das parcelas seja exatamente igual ao total do pedido.
    return Array.from({ length: quantidade }, (_, indice) =>
        (base + (indice < centavosExtras ? 1 : 0)) / 100
    );
}

function obterResumoParcelamento(total, quantidade) {
    const valores = distribuirParcelas(total, quantidade);
    const grupos = new Map();

    valores.forEach(valor => {
        const centavos = Math.round(valor * 100);
        grupos.set(centavos, (grupos.get(centavos) || 0) + 1);
    });

    return Array.from(grupos.entries()).map(([centavos, vezes]) => {
        return `${vezes}x de ${formatarMoeda(centavos / 100)}`;
    }).join(" + ");
}

function atualizarParcelamento() {
    const pagamento = document.getElementById("pagamento");
    const areaCartao = document.getElementById("cartao-area");
    const seletorParcelas = document.getElementById("parcelas");
    const resumo = document.getElementById("parcelamento-resumo");

    if (!pagamento || !areaCartao || !seletorParcelas) return;

    const cartaoSelecionado = pagamento.value === "Cartão de crédito";
    areaCartao.hidden = !cartaoSelecionado;

    if (!cartaoSelecionado) return;

    const recebimento = document.getElementById("recebimento");
    const taxa = recebimento && recebimento.value === "Entrega" ? TAXA_ENTREGA : 0;
    const total = calcularSubtotal() + taxa;
    const quantidade = Math.min(12, Math.max(1, Number(seletorParcelas.value) || 1));

    if (resumo) {
        resumo.textContent = `${obterResumoParcelamento(total, quantidade)} — total de ${formatarMoeda(total)}, sem juros.`;
    }
}

function configurarParcelamento() {
    const pagamento = document.getElementById("pagamento");
    const seletorParcelas = document.getElementById("parcelas");

    if (pagamento) pagamento.addEventListener("change", atualizarParcelamento);
    if (seletorParcelas) seletorParcelas.addEventListener("change", atualizarParcelamento);

    atualizarParcelamento();
}

// =================================
// FINALIZAR PEDIDO
// =================================

async function finalizarPedido(evento) {
    evento.preventDefault();

    const carrinho = obterCarrinho();

    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }

    const recebimento =
        document.getElementById("recebimento").value;

    const endereco =
        document.getElementById("endereco").value.trim();

    if (recebimento === "Entrega" && !endereco) {
        alert("Informe o endereço de entrega.");
        return;
    }

    const formaPagamento = document.getElementById("pagamento").value;
    let pagamentoRegistrado = formaPagamento;

    if (formaPagamento === "Cartão de crédito") {
        const quantidade = Math.min(12, Math.max(1, Number(document.getElementById("parcelas").value) || 1));
        const total = calcularTotal();
        const resumoParcelas = obterResumoParcelamento(total, quantidade);
        pagamentoRegistrado = `Cartão de crédito - ${resumoParcelas} (sem juros)`;
    }

    const pedido = {
        cliente: document.getElementById("nome").value.trim(),
        telefone: document.getElementById("telefone").value.trim(),
        recebimento,
        endereco: recebimento === "Entrega" ? endereco : "",
        pagamento: pagamentoRegistrado,
        itens: carrinho.map(item => ({
            produto_id: item.id,
            quantidade: item.quantidade
        }))
    };

    if (!pedido.cliente || !pedido.telefone ||
        !pedido.recebimento || !pedido.pagamento) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    try {
        const resposta = await fetch(`${API}/pedidos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(pedido)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || "Erro ao registrar pedido");
        }

        localStorage.removeItem("carrinho");

        alert("Pedido realizado com sucesso!");

        window.location.href = "orders.html";

    } catch (erro) {
        alert(erro.message);
    }
}

// =================================
// HISTÓRICO DE COMPRAS
// =================================

async function carregarPedidos() {
    const lista = document.getElementById("lista-pedidos");

    if (!lista) return;

    lista.innerHTML = '<p class="vazio">Carregando pedidos...</p>';

    try {
        const resposta = await fetch(`${API}/pedidos`);

        if (!resposta.ok) {
            throw new Error("Erro ao consultar pedidos");
        }

        const pedidos = await resposta.json();

        if (pedidos.length === 0) {
            lista.innerHTML =
                '<p class="vazio">Nenhuma compra realizada.</p>';
            return;
        }

        lista.innerHTML = pedidos.map(pedido => `
            <article class="pedido-card">

                <h3>Pedido #${pedido.id}</h3>

                <p><strong>Cliente:</strong>
                    ${escaparHTML(pedido.cliente)}
                </p>

                <p><strong>Produtos:</strong>
                    ${pedido.itens.map(item =>
                        `${escaparHTML(item.nome)} (${item.quantidade}x)`
                    ).join(", ")}
                </p>

                <p><strong>Total:</strong>
                    ${formatarMoeda(pedido.total)}
                </p>

                <p><strong>Pagamento:</strong>
                    ${escaparHTML(pedido.pagamento)}
                </p>

                <p><strong>Recebimento:</strong>
                    ${escaparHTML(pedido.recebimento)}
                </p>

                <p><strong>Status:</strong>
                    ${escaparHTML(pedido.status)}
                </p>

                <p><strong>Data:</strong>
                    ${new Date(pedido.data).toLocaleString("pt-BR")}
                </p>

            </article>
        `).join("");

    } catch (erro) {
        console.error(erro);
        lista.innerHTML =
            '<p class="vazio">Não foi possível carregar os pedidos.</p>';
    }
}

// =================================
// INICIALIZAÇÃO
// =================================

document.addEventListener("DOMContentLoaded", () => {

    const pesquisa = document.getElementById("pesquisa");

    if (pesquisa) {
        pesquisa.addEventListener("input", mostrarProdutos);

        const categoriaURL =
            new URLSearchParams(window.location.search).get("categoria");

        const categoriasValidas = [
            "Hambúrgueres",
            "Bebidas",
            "Porções"
        ];

        if (categoriasValidas.includes(categoriaURL)) {
            categoriaAtual = categoriaURL;
        }
    }

    const formulario = document.getElementById("form-pedido");

    if (formulario) {
        formulario.addEventListener("submit", finalizarPedido);
    }

    carregarProdutos();

    mostrarCarrinho();
    carregarPedidos();
    configurarRecebimento();
    configurarPix();
    configurarParcelamento();

});

