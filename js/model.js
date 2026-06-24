export class Model {
  constructor() {
    // Lista de prefixos válidos (5 dígitos)
    this.prefixes = [
      // Originais
      '07124', '07130', '07131', '07132', '07134', '07135', '07087',
      '07072', '07073', '07074', '07075', '07076', '07077', '07080',
      '07081', '07082', '07083', '07084', '07085',
      // Novos CEPs fornecidos pelo usuário
      '02237', '02238', '02281', '07010', '07011', '07020', '07023',
      '07024', '07025', '07040', '07041', '07044', '07050', '07051',
      '07052', '07055', '07056', '07060', '07061', '07062', '07070',
      '07071', '07090', '07091', '07092', '07093', '07094', '07095',
      '07096', '07097', '07111', '07115'
    ];

    // Lista de novos CEPs exatos fornecidos (salvos no formato limpo para verificação direta)
    const rawExactCeps = [
      "02237-000","02237-030","02238-090","02238-130","02281-110","07010-001",
      "07011-010","07020-001","07020-010","07020-320","07023-000","07024-000",
      "07024-020","07025-000","07040-000","07040-030","07041-020","07044-000",
      "07044-020","07050-000","07050-240","07050-250","07050-280","07050-290",
      "07051-011","07051-020","07051-090","07052-160","07055-000","07055-210",
      "07056-050","07056-110","07060-000","07060-010","07060-021","07060-022",
      "07060-023","07060-060","07060-080","07060-091","07060-101","07060-110",
      "07060-130","07061-000","07061-001","07061-002","07061-003","07062-000",
      "07062-152","07062-160","07062-161","07062-173","07070-000","07070-010",
      "07070-030","07070-060","07071-010","07071-040","07071-070","07072-040",
      "07072-060","07072-070","07072-080","07073-290","07074-000","07074-042",
      "07080-020","07080-111","07081-060","07081-120","07081-250","07090-000",
      "07090-230","07091-151","07092-051","07093-010","07093-020","07093-040",
      "07093-060","07093-090","07093-200","07094-000","07094-074","07094-190",
      "07095-010","07095-140","07095-150","07096-000","07096-010","07097-200",
      "07097-380","07111-000","07115-000","07115-010","07124-075"
    ];
    this.exactCeps = new Set(rawExactCeps.map(cep => this.normalizeCep(cep)));

    this.clear();
  }

  clear() {
    this.rawData = [];
    this.filteredData = [];
    this.headers = [];
    this.fileName = '';
    this.stats = {
      total: 0,
      valid: 0,
      invalid: 0
    };
  }

  normalizeCep(val) {
    return String(val || '').replace(/\D/g, '');
  }

  isValidCep(val) {
    const cleanCep = this.normalizeCep(val);
    if (!cleanCep) return false;
    
    // Verifica se coincide com algum prefixo de 5 dígitos
    const matchesPrefix = this.prefixes.some(prefix => cleanCep.startsWith(prefix));
    if (matchesPrefix) return true;

    // Verifica correspondência exata de 8 dígitos
    return this.exactCeps.has(cleanCep);
  }

  setData(headers, rows, fileName = '') {
    this.headers = headers || [];
    this.rawData = rows || [];
    this.fileName = fileName;
    this.filterData();
  }

  filterData() {
    if (!this.rawData.length) {
      this.clear();
      return;
    }

    // Detecta quais colunas contêm CEP com base nos cabeçalhos
    const cepCols = [];
    this.headers.forEach((header, index) => {
      if (typeof header === 'string' && /cep|endere[çc]o|address/i.test(header)) {
        cepCols.push(index);
      }
    });

    // Se nenhuma coluna corresponder ao nome, avalia todas as colunas
    if (!cepCols.length) {
      cepCols.push(...Array(this.headers.length).keys());
    }

    // Filtra linhas onde pelo menos um campo de CEP é válido
    this.filteredData = this.rawData.filter(row =>
      cepCols.some(colIndex => this.isValidCep(row[colIndex]))
    );

    // Calcula estatísticas
    const total = this.rawData.length;
    const valid = this.filteredData.length;
    const invalid = total - valid;

    this.stats = { total, valid, invalid };
  }

  // Métodos auxiliares de data e hora do Excel (conversões)
  excelSerialToDate(serial) {
    if (typeof serial !== 'number' || serial < 1) return serial;
    const utcDays = serial - 1;
    const msPerDay = 86400000;
    const epoch = new Date(Date.UTC(1900, 0, 1));
    const date = new Date(epoch.getTime() + (utcDays - 1) * msPerDay);
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  excelFractionToTime(fraction) {
    const totalMinutes = Math.round(fraction * 24 * 60);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  processCellValue(cell, header) {
    if (typeof header !== 'string' || cell === undefined || cell === null || cell === '') {
      return cell ?? '';
    }

    const h = header.toLowerCase();

    // Colunas de data
    if (/\bdata\b/.test(h)) {
      if (typeof cell === 'number' && cell > 1000) {
        return this.excelSerialToDate(cell);
      }
      return cell;
    }

    // Colunas de hora
    if (/hor[ao]|in[ií]cio|final/.test(h)) {
      if (typeof cell === 'number' && cell >= 0 && cell < 1) {
        return this.excelFractionToTime(cell);
      }
      return cell;
    }

    return cell;
  }
}
