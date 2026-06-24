export class View {
  constructor() {
    // Cache de elementos do DOM
    this.userInput = document.getElementById('userInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.fileInput = document.getElementById('fileInput');
    this.chat = document.getElementById('chat');
    this.workspace = document.getElementById('workspace');
    
    // Elementos de visualização/estado
    this.landingView = document.getElementById('landingView');
    this.dashboardView = document.getElementById('dashboardView');
    
    // Stats Cards
    this.statTotal = document.getElementById('statTotal');
    this.statValid = document.getElementById('statValid');
    this.statInvalid = document.getElementById('statInvalid');
    
    // Tabela e Resultados
    this.resultsCard = document.getElementById('resultsCard');
    this.resultsTitle = document.getElementById('resultsTitle');
    this.tableHeader = document.getElementById('tableHeader');
    this.tableBody = document.getElementById('tableBody');
    this.downloadBtn = document.getElementById('downloadBtn');
  }


  getTime() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Adiciona mensagem ao chat com scroll automático
  addChatMessage(text, sender = 'bot') {
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    div.innerHTML = `${text}<span class="time">${this.getTime()}</span>`;
    
    this.chat.appendChild(div);
    this.chat.scrollTop = this.chat.scrollHeight;
    return div;
  }

  // Controla o estado de Loading no painel principal
  showLoading() {
    this.showDashboard();
    this.resultsCard.style.display = 'none';
    
    // Cria ou reutiliza spinner
    let loader = document.getElementById('workspaceLoader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'workspaceLoader';
      loader.className = 'landing-view';
      loader.innerHTML = `
        <div class="spinner-container">
          <div class="spinner"></div>
          <p style="font-size: 0.95rem; color: var(--text-sub);">Processando dados...</p>
        </div>
      `;
      this.workspace.appendChild(loader);
    }
    loader.style.display = 'flex';
  }

  hideLoading() {
    const loader = document.getElementById('workspaceLoader');
    if (loader) loader.style.display = 'none';
    this.resultsCard.style.display = 'flex';
  }

  // Alterna entre tela inicial e dashboard
  showLanding() {
    this.landingView.style.display = 'flex';
    this.dashboardView.style.display = 'none';
    this.hideLoading();
  }

  showDashboard() {
    this.landingView.style.display = 'none';
    this.dashboardView.style.display = 'flex';
  }

  // Atualiza os cartões de estatísticas
  updateStats(stats) {
    this.statTotal.textContent = stats.total;
    this.statValid.textContent = stats.valid;
    this.statInvalid.textContent = stats.invalid;
  }

  // Preenche a tabela de resultados na tela
  renderTable(headers, data, isValidCepFn, processCellFn) {
    // Cabeçalho da Tabela
    this.tableHeader.innerHTML = `
      <tr>
        ${headers.map(h => `<th>${h || 'Coluna'}</th>`).join('')}
      </tr>
    `;

    if (data.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="${headers.length}" style="text-align: center; color: var(--text-sub); padding: 2rem;">
            Nenhuma obra correspondente aos CEPs da região.
          </td>
        </tr>
      `;
      this.downloadBtn.style.display = 'none';
      return;
    }

    this.downloadBtn.style.display = 'flex';

    // Corpo da Tabela
    this.tableBody.innerHTML = data.map(row => `
      <tr>
        ${headers.map((h, colIndex) => {
          let val = processCellFn(row[colIndex], h);
          const isCepCol = typeof h === 'string' && /cep/i.test(h);
          
          if (isCepCol && isValidCepFn(val)) {
            val = `<span class="cep-highlight">${val}</span>`;
          }
          
          return `<td title="${String(row[colIndex] || '')}">${val}</td>`;
        }).join('')}
      </tr>
    `).join('');
  }


  // Binds de Eventos direcionados ao Controller
  bindSendText(handler) {
    const triggerHandler = () => {
      const text = this.userInput.value.trim();
      if (text) {
        handler(text);
        this.userInput.value = '';
      }
    };

    this.sendBtn.addEventListener('click', triggerHandler);
    this.userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') triggerHandler();
    });
  }

  bindUploadFile(handler) {
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handler(file);
    });
  }

  bindDragAndDrop(handler) {
    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Zona de drop do painel principal e área lateral
    const dropZones = [this.landingView, document.getElementById('dropZoneChat')];

    dropZones.forEach(zone => {
      if (!zone) return;

      zone.addEventListener('dragover', (e) => {
        handleDrag(e);
        zone.classList.add('dragover');
      });

      zone.addEventListener('dragleave', (e) => {
        handleDrag(e);
        zone.classList.remove('dragover');
      });

      zone.addEventListener('drop', (e) => {
        handleDrag(e);
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handler(file);
      });
    });
  }

  bindExport(handler) {
    this.downloadBtn.addEventListener('click', handler);
  }
}
