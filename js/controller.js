export class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    // Binds de Eventos da Interface
    this.view.bindSendText(this.handleTextInput.bind(this));
    this.view.bindUploadFile(this.processFile.bind(this));
    this.view.bindDragAndDrop(this.processFile.bind(this));
    this.view.bindExport(this.exportResults.bind(this));
  }

  // Tratamento de entrada manual de dados colados
  handleTextInput(text) {
    this.view.addChatMessage(text, 'user');
    this.view.showLoading();

    // Simula tempo de processamento micro para efeito visual premium
    setTimeout(() => {
      const row = text.split('\t');
      
      // Tenta inferir cabeçalhos simples
      const headers = row.map((val) => {
        const clean = val.trim();
        if (/^\d{5}-?\d{3}$/.test(clean)) return 'CEP';
        return 'Dados';
      });

      this.model.setData(headers, [row], 'Dados Colados');

      this.view.hideLoading();
      this.view.updateStats(this.model.stats);
      
      this.view.renderTable(
        this.model.headers,
        this.model.filteredData,
        (cep) => this.model.isValidCep(cep),
        (cell, header) => this.model.processCellValue(cell, header)
      );

      if (this.model.filteredData.length > 0) {
        this.view.addChatMessage('✅ Obra válida identificada na região correspondente.', 'bot');
      } else {
        this.view.addChatMessage('⚠️ Obra com CEP fora da região cadastrada.', 'bot');
      }
    }, 400);
  }

  // Leitura e processamento de arquivos Excel (.xlsx / .xls)
  processFile(file) {
    this.view.addChatMessage(`📄 Recebendo planilha: <strong>${file.name}</strong>`, 'user');
    this.view.showLoading();

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        
        // Lê planilha mantendo números seriais (Datas/Horas processadas no Model)
        const workbook = window.XLSX.read(data, { type: 'array', cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
        if (!jsonData.length) {
          throw new Error("O arquivo carregado está vazio ou ilegível.");
        }

        const headers = jsonData[0];
        const rows = jsonData.slice(1);

        // Alimenta o Model
        this.model.setData(headers, rows, file.name);

        // Atualiza a View
        this.view.hideLoading();
        this.view.updateStats(this.model.stats);
        this.view.renderTable(
          this.model.headers,
          this.model.filteredData,
          (cep) => this.model.isValidCep(cep),
          (cell, header) => this.model.processCellValue(cell, header)
        );

        this.view.addChatMessage(
          `✅ <strong>Filtragem concluída!</strong><br>Encontradas <strong>${this.model.filteredData.length}</strong> obras válidas de um total de <strong>${this.model.rawData.length}</strong>.`,
          'bot'
        );
      } catch (err) {
        this.view.hideLoading();
        this.view.showLanding();
        this.view.addChatMessage(`❌ Erro ao processar arquivo: ${err.message}`, 'bot');
      }
    };

    reader.onerror = () => {
      this.view.hideLoading();
      this.view.showLanding();
      this.view.addChatMessage('❌ Falha na leitura física do arquivo.', 'bot');
    };

    reader.readAsArrayBuffer(file);
  }

  // Exportação das linhas válidas de volta para Excel
  exportResults() {
    const filtered = this.model.filteredData;
    if (!filtered.length) return;

    // Processa valores das células (como conversões de data e hora do Excel)
    const processedRows = filtered.map(row =>
      row.map((cell, colIndex) => this.model.processCellValue(cell, this.model.headers[colIndex]))
    );

    const exportData = [this.model.headers, ...processedRows];
    const worksheet = window.XLSX.utils.aoa_to_sheet(exportData);
    const workbook = window.XLSX.utils.book_new();
    
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Obras Filtradas');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const originalName = this.model.fileName ? this.model.fileName.split('.').slice(0, -1).join('.') : 'obras';
    const filename = `${originalName}_regiao_${timestamp}.xlsx`;

    window.XLSX.writeFile(workbook, filename);
    this.view.addChatMessage(`📥 Resultados exportados com sucesso no arquivo: <strong>${filename}</strong>`, 'bot');
  }
}
