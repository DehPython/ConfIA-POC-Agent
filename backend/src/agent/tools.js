const { PRODUCTS, ORDERS, SUPPORT_DEPARTMENTS } = require('../services/data');

const definitions = [
  {
    type: "function",
    function: {
      name: "buscar_produto",
      description: "Busca um produto por ID ou nome. Use quando o usuario perguntar sobre um produto especifico.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "ID do produto (ex: AC-001) ou parte do nome para busca",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_produtos",
      description: "Lista produtos disponiveis, opcionalmente filtrados por categoria. Use quando o usuario quiser ver opcoes de produtos.",
      parameters: {
        type: "object",
        properties: {
          categoria: {
            type: "string",
            description: "Categoria para filtrar (ex: Smartphones, TVs, Laptops). Se vazio, lista todas as categorias disponiveis.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_pedido",
      description: "Consulta o status de um pedido pelo numero do pedido. Use quando o usuario perguntar sobre um pedido.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Numero do pedido (ex: ORD-10001)",
          },
        },
        required: ["order_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "contato_suporte",
      description: "Retorna informacoes de contato de um departamento de suporte. Use quando o usuario precisar falar com um atendente humano ou departamento especifico.",
      parameters: {
        type: "object",
        properties: {
          departamento: {
            type: "string",
            enum: ["trocas", "garantia", "entrega", "pagamento", "geral"],
            description: "Departamento de suporte desejado",
          },
        },
        required: ["departamento"],
      },
    },
  },
];

const handlers = {
  buscar_produto({ query }) {
    const q = query.toUpperCase();
    // Busca por ID exato
    if (PRODUCTS[q]) {
      const p = PRODUCTS[q];
      return JSON.stringify(p, null, 2);
    }
    // Busca parcial por nome (case-insensitive)
    const lower = query.toLowerCase();
    const found = Object.values(PRODUCTS).filter(
      (p) => p.name.toLowerCase().includes(lower) || p.id.toLowerCase().includes(lower)
    );
    if (found.length === 0) {
      return JSON.stringify({ resultado: "Nenhum produto encontrado para: " + query });
    }
    return JSON.stringify(found, null, 2);
  },

  listar_produtos({ categoria } = {}) {
    if (!categoria) {
      const categorias = [...new Set(Object.values(PRODUCTS).map((p) => p.category))];
      return JSON.stringify({
        categorias_disponiveis: categorias,
        total_produtos: Object.keys(PRODUCTS).length,
      });
    }
    const lower = categoria.toLowerCase();
    const found = Object.values(PRODUCTS).filter(
      (p) => p.category.toLowerCase().includes(lower)
    );
    if (found.length === 0) {
      return JSON.stringify({ resultado: "Nenhum produto encontrado na categoria: " + categoria });
    }
    const summary = found.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      in_stock: p.in_stock,
      ...(p.restock_date ? { restock_date: p.restock_date } : {}),
    }));
    return JSON.stringify(summary, null, 2);
  },

  consultar_pedido({ order_id }) {
    const id = order_id.toUpperCase();
    const order = ORDERS[id];
    if (!order) {
      return JSON.stringify({ resultado: "Pedido nao encontrado: " + order_id });
    }
    return JSON.stringify(order, null, 2);
  },

  contato_suporte({ departamento }) {
    const dept = SUPPORT_DEPARTMENTS[departamento.toLowerCase()];
    if (!dept) {
      return JSON.stringify({
        resultado: "Departamento nao encontrado: " + departamento,
        departamentos_disponiveis: Object.keys(SUPPORT_DEPARTMENTS),
      });
    }
    return JSON.stringify(dept, null, 2);
  },
};

module.exports = { definitions, handlers };
