const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const raiz = path.resolve(__dirname, "..");
const dbPath = path.join(raiz, "banco", "dados.bd");
const db = new sqlite3.Database(dbPath);

app.use(express.json({ limit: "1mb" }));
app.use("/imagens", express.static(path.join(raiz, "banco", "Images")));
app.use(express.static(path.join(raiz, "Frontend")));

const run = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function (err) { err ? reject(err) : resolve({ id: this.lastID, changes: this.changes }); })
);
const all = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))
);
const get = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))
);

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");
  db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT,
    preco REAL NOT NULL, categoria TEXT NOT NULL, imagem TEXT, disponivel INTEGER DEFAULT 1
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, cliente TEXT NOT NULL, telefone TEXT NOT NULL,
    recebimento TEXT NOT NULL, endereco TEXT, pagamento TEXT NOT NULL, subtotal REAL NOT NULL,
    entrega REAL NOT NULL, total REAL NOT NULL, status TEXT DEFAULT 'Pendente', data TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS itens_pedido (
    id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER NOT NULL, produto_id INTEGER,
    nome TEXT NOT NULL, quantidade INTEGER NOT NULL, preco REAL NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id), FOREIGN KEY (produto_id) REFERENCES produtos(id)
  )`);
  db.run("PRAGMA table_info(pedidos)", (err) => {});
  db.all("PRAGMA table_info(pedidos)", (err, cols) => {
    if (!err && !cols.some(c => c.name === "troco_para")) {
      db.run("ALTER TABLE pedidos ADD COLUMN troco_para REAL");
    }
  });
});

app.get("/", (req, res) => res.sendFile(path.join(raiz, "Frontend", "index.html")));

app.get("/api/produtos", async (req, res) => {
  try {
    res.json(await all("SELECT * FROM produtos WHERE disponivel = 1 ORDER BY id"));
  } catch (e) { res.status(500).json({ erro: "Não foi possível carregar os produtos." }); }
});

app.post("/api/pedidos", async (req, res) => {
  const { cliente, telefone, recebimento, endereco, pagamento, itens, troco_para } = req.body || {};
  const pagamentos = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"];
  const recebimentos = ["Entrega", "Retirada", "Local"];
  if (!cliente?.trim() || !telefone?.trim() || !recebimentos.includes(recebimento) ||
      !pagamentos.includes(pagamento) || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "Confira os dados e adicione produtos ao carrinho." });
  }
  if (recebimento === "Entrega" && !endereco?.trim()) {
    return res.status(400).json({ erro: "Informe o endereço de entrega." });
  }
  try {
    let subtotal = 0;
    const itensValidados = [];
    for (const item of itens) {
      const quantidade = Number(item.quantidade);
      const produto = await get("SELECT id,nome,preco FROM produtos WHERE id = ? AND disponivel = 1", [Number(item.produto_id)]);
      if (!produto || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 99) {
        return res.status(400).json({ erro: "Um dos produtos do carrinho é inválido." });
      }
      subtotal += produto.preco * quantidade;
      itensValidados.push({ ...produto, quantidade });
    }
    const entrega = recebimento === "Entrega" ? 5 : 0;
    const total = subtotal + entrega;
    await run("BEGIN TRANSACTION");
    const pedido = await run(
      `INSERT INTO pedidos (cliente,telefone,recebimento,endereco,pagamento,subtotal,entrega,total,status,data,troco_para)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [cliente.trim(), telefone.trim(), recebimento, recebimento === "Entrega" ? endereco.trim() : "",
       pagamento, subtotal, entrega, total, "Pendente", new Date().toISOString(),
       pagamento === "Dinheiro" && troco_para ? Number(troco_para) : null]
    );
    for (const item of itensValidados) {
      await run("INSERT INTO itens_pedido (pedido_id,produto_id,nome,quantidade,preco) VALUES (?,?,?,?,?)",
        [pedido.id, item.id, item.nome, item.quantidade, item.preco]);
    }
    await run("COMMIT");
    res.status(201).json({ mensagem: "Pedido registrado.", id: pedido.id, total });
  } catch (e) {
    await run("ROLLBACK").catch(() => {});
    console.error(e);
    res.status(500).json({ erro: "Erro ao registrar o pedido." });
  }
});

app.get("/api/pedidos", async (req, res) => {
  try {
    const pedidos = await all("SELECT * FROM pedidos ORDER BY id DESC");
    for (const pedido of pedidos) {
      pedido.itens = await all("SELECT nome,quantidade,preco FROM itens_pedido WHERE pedido_id = ?", [pedido.id]);
    }
    res.json(pedidos);
  } catch (e) { res.status(500).json({ erro: "Não foi possível carregar o histórico." }); }
});

app.listen(PORT, () => console.log(`Esquina do Sabor funcionando em http://localhost:${PORT}`));
