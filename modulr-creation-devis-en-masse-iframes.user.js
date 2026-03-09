// ==UserScript==
// @name         Modulr - Création de Devis en Masse (iFrames)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Permet de créer plusieurs devis simultanément via iframes cachées (vraiment en arrière-plan)
// @author       LTOA Assurances
// @match        https://courtage.modulr.fr/fr/scripts/clients/clients_card.php*
// @match        https://*.modulr.fr/fr/scripts/clients/clients_card.php*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/BiggerThanTheMall/tampermonkey-ltoa/main/userscripts/modulr-creation-devis-en-masse-iframes.user.js
// @updateURL    https://raw.githubusercontent.com/BiggerThanTheMall/tampermonkey-ltoa/main/userscripts/modulr-creation-devis-en-masse-iframes.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ================================================================
    // CONFIGURATION
    // ================================================================

    const PRODUCT_TYPES = [
        { value: "20", label: "2 roues" },
        { value: "58", label: "Animaux" },
        { value: "49", label: "Assurance scolaire" },
        { value: "53", label: "Assurance Vie" },
        { value: "8", label: "Assurance voyage" },
        { value: "40", label: "Audit Assurance Global" },
        { value: "2", label: "Automobile" },
        { value: "10", label: "Dommage ouvrage" },
        { value: "26", label: "Emprunteur" },
        { value: "60", label: "Epargne Salariale" },
        { value: "52", label: "Extension santé - Renfort ou Ayant Droit" },
        { value: "6", label: "Flotte auto" },
        { value: "7", label: "Flotte immeubles" },
        { value: "44", label: "GRC" },
        { value: "1", label: "Habitation principale" },
        { value: "11", label: "Habitation secondaire" },
        { value: "13", label: "Marchandises transportées" },
        { value: "30", label: "MRC" },
        { value: "3", label: "MRH" },
        { value: "29", label: "MRI" },
        { value: "41", label: "MRP" },
        { value: "14", label: "Perte d'exploitation" },
        { value: "15", label: "PJ" },
        { value: "23", label: "PNO" },
        { value: "28", label: "Prévoyance collective C" },
        { value: "48", label: "Prévoyance collective EP" },
        { value: "47", label: "Prévoyance collective NC" },
        { value: "38", label: "Prévoyance Décès" },
        { value: "35", label: "Prévoyance Frais Généraux Permanents (FGP)" },
        { value: "32", label: "Prévoyance Garantie Accident de la Vie" },
        { value: "36", label: "Prévoyance Homme Clé" },
        { value: "34", label: "Prévoyance Indemnité Journalière Hospitalisation (IJH)" },
        { value: "27", label: "Prévoyance Individuelle TNS" },
        { value: "37", label: "Prévoyance Mandataire Sociale" },
        { value: "33", label: "Prévoyance Obsèques" },
        { value: "55", label: "RC Batiment" },
        { value: "16", label: "RC constructeur" },
        { value: "17", label: "RC décennale" },
        { value: "18", label: "RC des dirigeants" },
        { value: "42", label: "RC Marchandise" },
        { value: "25", label: "RC PRO" },
        { value: "24", label: "RC Vie privée" },
        { value: "61", label: "RCMS" },
        { value: "50", label: "Retraite" },
        { value: "45", label: "Santé collective C" },
        { value: "46", label: "Santé collective EP" },
        { value: "19", label: "Santé collective NC" },
        { value: "5", label: "Santé Individuelle Particulier" },
        { value: "39", label: "Santé Individuelle TNS" },
        { value: "43", label: "Surcomplémentaire Santé" },
        { value: "56", label: "Surcomplémentaire Santé Non Résponsable" },
        { value: "51", label: "TRC - Tous risques chantier" },
        { value: "9", label: "Vie" }
    ];

    const ESTIMATE_STATUS = [
        { value: "current", label: "En cours" },
        { value: "pricing", label: "En tarification" },
        { value: "delivered", label: "Remis" },
        { value: "canceled", label: "Sans suite" },
        { value: "refused", label: "Refus" },
        { value: "pending_approval", label: "En attente de validation" },
        { value: "pending_parts", label: "En attente de pièce" }
    ];

    const REFERENTS = [
        { value: "", label: "-- Aucun --" },
        { value: "33", label: "Doryan KALAH" },
        { value: "23", label: "Eddy KALAH" },
        { value: "24", label: "Ghais Kalah" },
        { value: "28", label: "Jake CASIMIR" },
        { value: "36", label: "Louli VULLIOD-PIN" },
        { value: "22", label: "Nadia KALAH" },
        { value: "2", label: "Sheana KRIEF" },
        { value: "29", label: "Wesley DAUX" },
        { value: "39", label: "Youness OUACHBAB" }
    ];

    // Max concurrent iframes (don't overload server)
    const MAX_CONCURRENT = 3;

    let selectedProducts = [];
    let clientId = null;
    let isProcessing = false;

    function getClientId() {
        const urlParams = new URLSearchParams(window.location.search);
        let id = urlParams.get('id');
        if (!id) {
            const clientInput = document.getElementById('client_id_');
            if (clientInput) id = clientInput.value;
        }
        return id;
    }

    function getTodayDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function injectStyles() {
        if (document.getElementById('bulk-estimate-styles')) return;

        const styles = `
            <style id="bulk-estimate-styles">
                .bulk-estimate-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

.bulk-estimate-modal {
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-width: 1280px;
    width: 96vw;
    height: 92vh;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
}

                .bulk-estimate-header {
                    background: var(--color-header-background, #215c7f);
                    color: #fff;
                    padding: 15px 20px;
                    border-radius: 4px 4px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .bulk-estimate-header h2 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: normal;
                }

                .bulk-estimate-close {
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                }

.bulk-estimate-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
}

                .bulk-estimate-section {
                    margin-bottom: 20px;
                }

                .bulk-estimate-section-title {
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: var(--color-main, #688396);
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                }

                .bulk-estimate-products-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 8px;
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid #ddd;
                    padding: 10px;
                    border-radius: 4px;
                    background: #f9f9f9;
                }

                .bulk-estimate-product-item {
                    display: flex;
                    align-items: center;
                    padding: 5px;
                    background: #fff;
                    border-radius: 3px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .bulk-estimate-product-item:hover {
                    background: var(--color-hover-list-rows, #e0d3b1);
                }

                .bulk-estimate-product-item input[type="checkbox"] {
                    margin-right: 8px;
                    cursor: pointer;
                }

                .bulk-estimate-product-item label {
                    cursor: pointer;
                    font-size: 12px;
                    flex: 1;
                }

.bulk-estimate-table-container {
    display: flex;
    gap: 20px;
    align-items: stretch;
    min-height: 420px;
    max-height: calc(92vh - 330px);
}

.bulk-estimate-table-wrapper {
    flex: 1;
    overflow-x: auto;
    overflow-y: auto;
    min-height: 300px;
    max-height: 100%;
}

                .bulk-estimate-selected-table {
                    width: 100%;
                    border-collapse: collapse;
                }
.bulk-estimate-selected-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
}

.bulk-estimate-selected-table tbody td {
    vertical-align: top;
}
                .bulk-estimate-selected-table th,
                .bulk-estimate-selected-table td {
                    padding: 8px 10px;
                    border: 1px solid #ddd;
                    text-align: left;
                }

                .bulk-estimate-selected-table th {
                    background: var(--color-main, #688396);
                    color: #fff;
                    font-weight: normal;
                    font-size: 12px;
                }

                .bulk-estimate-selected-table tr:nth-child(even) {
                    background: #f5f5f5;
                }

                .bulk-estimate-selected-table tr:hover {
                    background: var(--color-hover-list-rows, #e0d3b1);
                }

                .bulk-estimate-selected-table select {
                    width: 100%;
                    padding: 5px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    cursor: pointer;
                }

                .bulk-estimate-selected-table select:disabled {
                    background: #e9ecef;
                    cursor: not-allowed;
                }

                .bulk-estimate-selected-table .remove-btn {
                    background: #dc3545;
                    color: #fff;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .bulk-estimate-selected-table .remove-btn:hover {
                    background: #c82333;
                }

                .bulk-estimate-global-options {
                    background: linear-gradient(135deg, #f0f4f7 0%, #e8eef2 100%);
                    padding: 15px;
                    border-radius: 4px;
                    border: 1px solid #ccc;
                    min-width: 220px;
                    flex-shrink: 0;
                }

                .bulk-estimate-global-options-title {
                    font-weight: bold;
                    margin-bottom: 12px;
                    color: var(--color-main, #688396);
                    font-size: 13px;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 8px;
                }

                .bulk-estimate-global-option {
                    margin-bottom: 15px;
                }

                .bulk-estimate-global-option:last-child {
                    margin-bottom: 0;
                }

                .bulk-estimate-global-option-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .bulk-estimate-global-option-header input[type="checkbox"] {
                    margin: 0;
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }

                .bulk-estimate-global-option-header label {
                    font-size: 12px;
                    font-weight: 500;
                    cursor: pointer;
                }

                .bulk-estimate-global-option select {
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    font-size: 12px;
                    background: #e9ecef;
                    cursor: not-allowed;
                    pointer-events: none;
                    opacity: 0.6;
                }

                .bulk-estimate-global-option select.enabled {
                    background: #fff !important;
                    cursor: pointer !important;
                    border-color: var(--color-main, #688396) !important;
                    pointer-events: auto !important;
                    opacity: 1 !important;
                }

                .bulk-estimate-footer {
                    padding: 15px 20px;
                    border-top: 1px solid #ddd;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    background: #f5f5f5;
                    border-radius: 0 0 4px 4px;
                }

                .bulk-estimate-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .bulk-estimate-btn-primary {
                    background: var(--color-main, #688396);
                    color: #fff;
                }

                .bulk-estimate-btn-primary:hover {
                    background: var(--color-main-darker, #5e7687);
                }

                .bulk-estimate-btn-secondary {
                    background: #6c757d;
                    color: #fff;
                }

                .bulk-estimate-btn-secondary:hover {
                    background: #5a6268;
                }

                .bulk-estimate-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .bulk-estimate-empty-message {
                    text-align: center;
                    color: #999;
                    font-style: italic;
                    padding: 20px;
                    background: #f9f9f9;
                    border: 1px dashed #ddd;
                    border-radius: 4px;
                }

                .bulk-estimate-search {
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    margin-bottom: 10px;
                }

                .bulk-estimate-quick-actions {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .bulk-estimate-quick-btn {
                    padding: 5px 10px;
                    font-size: 12px;
                    background: #e9ecef;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                    cursor: pointer;
                }

                .bulk-estimate-quick-btn:hover {
                    background: #ddd;
                }

                .bulk-estimate-trigger {
                    cursor: pointer;
                }

                .bulk-estimate-trigger .fa-stack-2x {
                    color: var(--color-main, #688396);
                }

                .bulk-estimate-trigger:hover .fa-stack-2x {
                    color: var(--color-hover-main, #d6c491);
                }

                /* Progress section */
                .bulk-estimate-progress {
                    background: #f8f9fa;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 20px;
                    margin-top: 15px;
                }

                .bulk-estimate-progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .bulk-estimate-progress-title {
                    font-weight: bold;
                    color: var(--color-main, #688396);
                }

                .bulk-estimate-progress-count {
                    font-size: 14px;
                    color: #666;
                }

                .bulk-estimate-progress-bar {
                    height: 24px;
                    background: #e9ecef;
                    border-radius: 12px;
                    overflow: hidden;
                    margin-bottom: 10px;
                }

                .bulk-estimate-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--color-main, #688396), var(--color-hover-main, #d6c491));
                    transition: width 0.3s ease;
                    border-radius: 12px;
                }

                .bulk-estimate-progress-current {
                    font-size: 13px;
                    color: #666;
                    text-align: center;
                }

                .bulk-estimate-progress-log {
                    margin-top: 15px;
                    max-height: 200px;
                    overflow-y: auto;
                    font-size: 12px;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                }

                .bulk-estimate-log-item {
                    padding: 4px 0;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .bulk-estimate-log-item:last-child {
                    border-bottom: none;
                }

                .bulk-estimate-log-item.success {
                    color: #28a745;
                }

                .bulk-estimate-log-item.error {
                    color: #dc3545;
                }

                .bulk-estimate-log-item.pending {
                    color: #6c757d;
                }

                .bulk-estimate-result {
                    margin-top: 15px;
                    padding: 15px;
                    border-radius: 4px;
                    text-align: center;
                    font-weight: bold;
                }

                .bulk-estimate-result.success {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }

                .bulk-estimate-result.partial {
                    background: #fff3cd;
                    color: #856404;
                    border: 1px solid #ffeeba;
                }

                .bulk-estimate-result.error {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }

                /* Hidden iframe container */
                .bulk-estimate-iframe-container {
                    position: fixed;
                    left: -9999px;
                    top: -9999px;
                    width: 1px;
                    height: 1px;
                    visibility: hidden;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    function createTriggerButton() {
        const checkInterval = setInterval(() => {
            const estimatesTab = document.querySelector('.entity_info_block_1');
            if (estimatesTab) {
                const existingAddBtn = estimatesTab.querySelector('a[href*="estimates_manage.php"]');
                if (existingAddBtn && !document.querySelector('.bulk-estimate-trigger')) {
                    const triggerBtn = document.createElement('span');
                    triggerBtn.className = 'fa-stack fa-lg square_icon bulk-estimate-trigger';
                    triggerBtn.title = 'Créer plusieurs devis en masse';
                    triggerBtn.innerHTML = `
                        <span class="fa fa-square fa-stack-2x"></span>
                        <span class="fa fa-layer-group fa-stack-1x fa-inverse"></span>
                    `;
                    triggerBtn.addEventListener('click', openModal);
                    existingAddBtn.parentNode.insertBefore(triggerBtn, existingAddBtn);
                    clearInterval(checkInterval);
                }
            }
        }, 500);
    }

    function createModal() {
        if (document.getElementById('bulk-estimate-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'bulk-estimate-modal';
        modal.className = 'bulk-estimate-overlay';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="bulk-estimate-modal">
                <div class="bulk-estimate-header">
                    <h2><span class="fa fa-layer-group"></span> Création de Devis en Masse</h2>
                    <button class="bulk-estimate-close" id="bulk-estimate-close">&times;</button>
                </div>
                <div class="bulk-estimate-body">
                    <div id="bulk-estimate-form-section">
                        <div class="bulk-estimate-section">
                            <div class="bulk-estimate-section-title">
                                <span class="fa fa-th-list"></span> Sélectionner les types de produits
                            </div>
                            <input type="text" class="bulk-estimate-search" id="bulk-estimate-search" placeholder="Rechercher un type de produit...">
                            <div class="bulk-estimate-quick-actions">
                                <button type="button" class="bulk-estimate-quick-btn" id="bulk-select-all">Tout sélectionner</button>
                                <button type="button" class="bulk-estimate-quick-btn" id="bulk-deselect-all">Tout désélectionner</button>
                            </div>
                            <div class="bulk-estimate-products-grid" id="bulk-estimate-products">
                                ${PRODUCT_TYPES.map(p => `
                                    <div class="bulk-estimate-product-item">
                                        <input type="checkbox" id="product-${p.value}" data-value="${p.value}" data-label="${p.label}">
                                        <label for="product-${p.value}">${p.label}</label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="bulk-estimate-section">
                            <div class="bulk-estimate-section-title">
                                <span class="fa fa-file-alt"></span> Devis à créer (<span id="bulk-estimate-count">0</span>)
                            </div>
                            <div class="bulk-estimate-table-container">
                                <div class="bulk-estimate-table-wrapper" id="bulk-estimate-selected-container">
                                    <p class="bulk-estimate-empty-message">Sélectionnez des types de produits ci-dessus</p>
                                </div>
                                <div class="bulk-estimate-global-options" id="bulk-estimate-global-options" style="display: none;">
                                    <div class="bulk-estimate-global-options-title">
                                        <span class="fa fa-cog"></span> Appliquer à tous
                                    </div>
                                    <div class="bulk-estimate-global-option">
                                        <div class="bulk-estimate-global-option-header">
                                            <input type="checkbox" id="global-status-enabled">
                                            <label for="global-status-enabled">Même état</label>
                                        </div>
                                        <select id="global-status">
                                            ${ESTIMATE_STATUS.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="bulk-estimate-global-option">
                                        <div class="bulk-estimate-global-option-header">
                                            <input type="checkbox" id="global-referent-enabled">
                                            <label for="global-referent-enabled">Même référent</label>
                                        </div>
                                        <select id="global-referent">
                                            ${REFERENTS.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="bulk-estimate-progress-section" style="display: none;">
                        <div class="bulk-estimate-progress">
                            <div class="bulk-estimate-progress-header">
                                <span class="bulk-estimate-progress-title" id="bulk-progress-title">
                                    <span class="fa fa-spinner fa-spin"></span> Création en cours...
                                </span>
                                <span class="bulk-estimate-progress-count" id="bulk-progress-count">0/0</span>
                            </div>
                            <div class="bulk-estimate-progress-bar">
                                <div class="bulk-estimate-progress-fill" id="bulk-progress-fill" style="width: 0%"></div>
                            </div>
                            <div class="bulk-estimate-progress-current" id="bulk-progress-current">
                                Initialisation...
                            </div>
                            <div class="bulk-estimate-progress-log" id="bulk-progress-log"></div>
                        </div>
                        <div id="bulk-estimate-result" style="display: none;"></div>
                    </div>
                </div>
                <div class="bulk-estimate-footer">
                    <button type="button" class="bulk-estimate-btn bulk-estimate-btn-secondary" id="bulk-estimate-cancel">
                        <span class="fa fa-times"></span> Annuler
                    </button>
                    <button type="button" class="bulk-estimate-btn bulk-estimate-btn-primary" id="bulk-estimate-submit" disabled>
                        <span class="fa fa-check"></span> Créer les devis
                    </button>
                </div>
            </div>
        `;

        // Create hidden iframe container
        const iframeContainer = document.createElement('div');
        iframeContainer.id = 'bulk-estimate-iframe-container';
        iframeContainer.className = 'bulk-estimate-iframe-container';
        document.body.appendChild(iframeContainer);

        document.body.appendChild(modal);
        setTimeout(() => attachModalEvents(), 100);
    }

    function attachModalEvents() {
        document.getElementById('bulk-estimate-close').onclick = () => {
            if (!isProcessing) closeModal();
        };

        document.getElementById('bulk-estimate-cancel').onclick = () => {
            if (!isProcessing) {
                closeModal();
            } else {
                if (confirm('Voulez-vous interrompre la création des devis ?')) {
                    isProcessing = false;
                }
            }
        };

        document.getElementById('bulk-estimate-modal').onclick = (e) => {
            if (e.target.id === 'bulk-estimate-modal' && !isProcessing) closeModal();
        };

        document.getElementById('bulk-estimate-search').oninput = filterProducts;

        document.getElementById('bulk-select-all').onclick = () => {
            document.querySelectorAll('#bulk-estimate-products .bulk-estimate-product-item').forEach(item => {
                if (item.style.display !== 'none') {
                    const cb = item.querySelector('input[type="checkbox"]');
                    if (cb) cb.checked = true;
                }
            });
            updateSelectedProducts();
        };

        document.getElementById('bulk-deselect-all').onclick = () => {
            document.querySelectorAll('#bulk-estimate-products input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            updateSelectedProducts();
        };

        document.querySelectorAll('#bulk-estimate-products input[type="checkbox"]').forEach(cb => {
            cb.onchange = updateSelectedProducts;
        });

        // Global status
        const globalStatusCheckbox = document.getElementById('global-status-enabled');
        const globalStatusSelect = document.getElementById('global-status');
        globalStatusCheckbox.onchange = function() {
            if (this.checked) {
                globalStatusSelect.classList.add('enabled');
                applyGlobalStatus();
            } else {
                globalStatusSelect.classList.remove('enabled');
            }
            renderSelectedTable();
        };
        globalStatusSelect.onchange = function() {
            if (globalStatusCheckbox.checked) applyGlobalStatus();
        };

        // Global referent
        const globalReferentCheckbox = document.getElementById('global-referent-enabled');
        const globalReferentSelect = document.getElementById('global-referent');
        globalReferentCheckbox.onchange = function() {
            if (this.checked) {
                globalReferentSelect.classList.add('enabled');
                applyGlobalReferent();
            } else {
                globalReferentSelect.classList.remove('enabled');
            }
            renderSelectedTable();
        };
        globalReferentSelect.onchange = function() {
            if (globalReferentCheckbox.checked) applyGlobalReferent();
        };

        document.getElementById('bulk-estimate-submit').onclick = startBulkCreation;
    }

    function filterProducts() {
        const search = document.getElementById('bulk-estimate-search').value.toLowerCase();
        document.querySelectorAll('.bulk-estimate-product-item').forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            item.style.display = label.includes(search) ? '' : 'none';
        });
    }

    function updateSelectedProducts() {
        selectedProducts = [];
        document.querySelectorAll('#bulk-estimate-products input[type="checkbox"]:checked').forEach(cb => {
            selectedProducts.push({
                value: cb.dataset.value,
                label: cb.dataset.label,
                status: 'current',
                referent: ''
            });
        });

        document.getElementById('bulk-estimate-global-options').style.display = selectedProducts.length > 0 ? 'block' : 'none';
        renderSelectedTable();
        document.getElementById('bulk-estimate-count').textContent = selectedProducts.length;
        document.getElementById('bulk-estimate-submit').disabled = selectedProducts.length === 0;

        if (document.getElementById('global-status-enabled').checked) applyGlobalStatus();
        if (document.getElementById('global-referent-enabled').checked) applyGlobalReferent();
    }

    function renderSelectedTable() {
        const container = document.getElementById('bulk-estimate-selected-container');
        if (selectedProducts.length === 0) {
            container.innerHTML = '<p class="bulk-estimate-empty-message">Sélectionnez des types de produits ci-dessus</p>';
            return;
        }

        const globalStatusEnabled = document.getElementById('global-status-enabled').checked;
        const globalReferentEnabled = document.getElementById('global-referent-enabled').checked;

        container.innerHTML = `
            <table class="bulk-estimate-selected-table">
                <thead>
                    <tr>
                        <th style="width: 40%">Type de produit</th>
                        <th style="width: 25%">État du devis</th>
                        <th style="width: 25%">Référent</th>
                        <th style="width: 10%"></th>
                    </tr>
                </thead>
                <tbody>
                    ${selectedProducts.map((p, idx) => `
                        <tr data-index="${idx}">
                            <td>${p.label}</td>
                            <td>
                                <select class="status-select" data-index="${idx}" ${globalStatusEnabled ? 'disabled' : ''}>
                                    ${ESTIMATE_STATUS.map(s => `<option value="${s.value}" ${p.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <select class="referent-select" data-index="${idx}" ${globalReferentEnabled ? 'disabled' : ''}>
                                    ${REFERENTS.map(r => `<option value="${r.value}" ${p.referent === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <button type="button" class="remove-btn" data-value="${p.value}" title="Retirer">
                                    <span class="fa fa-trash"></span>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.querySelectorAll('.status-select').forEach(select => {
            select.onchange = (e) => {
                selectedProducts[parseInt(e.target.dataset.index)].status = e.target.value;
            };
        });

        container.querySelectorAll('.referent-select').forEach(select => {
            select.onchange = (e) => {
                selectedProducts[parseInt(e.target.dataset.index)].referent = e.target.value;
            };
        });

        container.querySelectorAll('.remove-btn').forEach(btn => {
            btn.onclick = (e) => {
                const value = e.currentTarget.dataset.value;
                const checkbox = document.querySelector(`#product-${value}`);
                if (checkbox) checkbox.checked = false;
                updateSelectedProducts();
            };
        });
    }

    function applyGlobalStatus() {
        const status = document.getElementById('global-status').value;
        selectedProducts.forEach(p => p.status = status);
        document.querySelectorAll('.status-select').forEach(select => select.value = status);
    }

    function applyGlobalReferent() {
        const referent = document.getElementById('global-referent').value;
        selectedProducts.forEach(p => p.referent = referent);
        document.querySelectorAll('.referent-select').forEach(select => select.value = referent);
    }

    function openModal() {
        clientId = getClientId();
        if (!clientId) {
            alert('Impossible de récupérer l\'ID client');
            return;
        }

        document.getElementById('bulk-estimate-modal').style.display = 'flex';
        document.getElementById('bulk-estimate-form-section').style.display = 'block';
        document.getElementById('bulk-estimate-progress-section').style.display = 'none';
        document.getElementById('bulk-estimate-submit').style.display = '';
        document.getElementById('bulk-estimate-result').style.display = 'none';
        document.getElementById('bulk-progress-log').innerHTML = '';
    }

    function closeModal() {
        if (isProcessing) return;

        document.getElementById('bulk-estimate-modal').style.display = 'none';
        document.querySelectorAll('#bulk-estimate-products input[type="checkbox"]').forEach(cb => cb.checked = false);
        selectedProducts = [];
        updateSelectedProducts();
        document.getElementById('bulk-estimate-search').value = '';
        filterProducts();
        document.getElementById('global-status-enabled').checked = false;
        document.getElementById('global-referent-enabled').checked = false;
        document.getElementById('global-status').classList.remove('enabled');
        document.getElementById('global-referent').classList.remove('enabled');

        // Clean iframes
        document.getElementById('bulk-estimate-iframe-container').innerHTML = '';
    }

    function addLogEntry(text, status, id) {
        const log = document.getElementById('bulk-progress-log');
        const existing = log.querySelector(`[data-id="${id}"]`);

        let icon = status === 'success' ? 'fa-check-circle' : status === 'error' ? 'fa-times-circle' : 'fa-spinner fa-spin';

        if (existing) {
            existing.className = `bulk-estimate-log-item ${status}`;
            existing.innerHTML = `<span class="fa ${icon}"></span> ${text}`;
        } else {
            const item = document.createElement('div');
            item.className = `bulk-estimate-log-item ${status}`;
            item.dataset.id = id;
            item.innerHTML = `<span class="fa ${icon}"></span> ${text}`;
            log.appendChild(item);
        }
        log.scrollTop = log.scrollHeight;
    }

    function updateProgressBar(completed, total, current) {
        document.getElementById('bulk-progress-count').textContent = `${completed}/${total}`;
        const percent = Math.round((completed / total) * 100);
        document.getElementById('bulk-progress-fill').style.width = `${percent}%`;
        if (current) {
            document.getElementById('bulk-progress-current').textContent = current;
        }
    }

    // Create estimate via iframe
    function createEstimateViaIframe(product, index) {
        return new Promise((resolve, reject) => {
            const iframeId = `bulk-iframe-${index}`;
            const logId = `estimate-${index}`;

            addLogEntry(`${product.label}...`, 'pending', logId);

            const iframe = document.createElement('iframe');
            iframe.id = iframeId;
            iframe.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;visibility:hidden;';
            iframe.src = `https://courtage.modulr.fr/fr/scripts/estimates/estimates_manage.php?client_id=${clientId}&estimate_id=0`;

            let loadCount = 0;
            let formFilled = false;

            iframe.onload = async function() {
                loadCount++;

                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    // First load: fill and submit form
                    if (loadCount === 1 && !formFilled) {
                        formFilled = true;

                        // Wait for page to fully render
                        await new Promise(r => setTimeout(r, 1000));

                        // Select product type
                        const productRadio = iframeDoc.querySelector(`input[name="selectItemestimate[product_type_id]"][value="${product.value}"]`);
                        if (productRadio) productRadio.click();

                        await new Promise(r => setTimeout(r, 200));

                        // Select status
                        const statusRadio = iframeDoc.querySelector(`input[name="selectItemestimate[status]"][value="${product.status}"]`);
                        if (statusRadio) statusRadio.click();

                        await new Promise(r => setTimeout(r, 200));

                        // Select referent
                        if (product.referent) {
                            const referentRadio = iframeDoc.querySelector(`input[name="selectItemestimate[referent_user_id]"][value="${product.referent}"]`);
                            if (referentRadio) referentRadio.click();
                        }

                        await new Promise(r => setTimeout(r, 200));

                        // Fill date
                        const todayStr = getTodayDate();
                        const dateInput = iframeDoc.querySelector('input[name="estimate[custom_14]"]');
                        if (dateInput) {
                            dateInput.value = todayStr;
                            dateInput.dispatchEvent(new Event('input', { bubbles: true }));
                            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }

                        await new Promise(r => setTimeout(r, 300));

                        // Submit form
                        const submitBtn = iframeDoc.querySelector('button.button_link.button_link_icon.disable_button_after_submit[type="submit"]');
                        if (submitBtn) {
                            submitBtn.click();
                        } else {
                            // Try form submit directly
                            const form = iframeDoc.querySelector('form');
                            if (form) form.submit();
                        }
                    }
                    // Second load: form was submitted, check result
                    else if (loadCount >= 2) {
                        // If we get here, form was submitted
                        addLogEntry(`${product.label} - Créé avec succès`, 'success', logId);

                        // Remove iframe
                        setTimeout(() => {
                            iframe.remove();
                        }, 500);

                        resolve({ success: true, product });
                    }
                } catch (error) {
                    console.error('Iframe error:', error);
                    addLogEntry(`${product.label} - Erreur: ${error.message}`, 'error', logId);
                    iframe.remove();
                    resolve({ success: false, product, error: error.message });
                }
            };

            iframe.onerror = function(error) {
                addLogEntry(`${product.label} - Erreur de chargement`, 'error', logId);
                iframe.remove();
                resolve({ success: false, product, error: 'Erreur de chargement' });
            };

            // Timeout after 30 seconds
            setTimeout(() => {
                if (loadCount < 2) {
                    addLogEntry(`${product.label} - Timeout`, 'error', logId);
                    iframe.remove();
                    resolve({ success: false, product, error: 'Timeout' });
                }
            }, 30000);

            document.getElementById('bulk-estimate-iframe-container').appendChild(iframe);
        });
    }

    async function startBulkCreation() {
        if (selectedProducts.length === 0 || isProcessing) return;

        isProcessing = true;

        // Show progress
        document.getElementById('bulk-estimate-form-section').style.display = 'none';
        document.getElementById('bulk-estimate-progress-section').style.display = 'block';
        document.getElementById('bulk-estimate-submit').style.display = 'none';
        document.getElementById('bulk-estimate-cancel').innerHTML = '<span class="fa fa-stop"></span> Interrompre';
        document.getElementById('bulk-progress-title').innerHTML = '<span class="fa fa-spinner fa-spin"></span> Création en cours...';

        const total = selectedProducts.length;
        let completed = 0;
        let successCount = 0;
        let errorCount = 0;

        updateProgressBar(0, total, 'Démarrage...');

        // Process in batches of MAX_CONCURRENT
        const products = [...selectedProducts];

        while (products.length > 0 && isProcessing) {
            const batch = products.splice(0, MAX_CONCURRENT);
            const batchIndex = total - products.length - batch.length;

            updateProgressBar(completed, total, `Traitement par lot de ${batch.length}...`);

            // Process batch in parallel
            const results = await Promise.all(
                batch.map((product, i) => createEstimateViaIframe(product, batchIndex + i))
            );

            // Count results
            results.forEach(result => {
                completed++;
                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            });

            updateProgressBar(completed, total, `${completed}/${total} traités`);

            // Small delay between batches
            if (products.length > 0) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // Done
        isProcessing = false;

        document.getElementById('bulk-progress-title').innerHTML = '<span class="fa fa-check-circle"></span> Terminé';
        document.getElementById('bulk-progress-current').textContent = 'Terminé !';

        const resultDiv = document.getElementById('bulk-estimate-result');
        resultDiv.style.display = 'block';

        if (errorCount === 0) {
            resultDiv.className = 'bulk-estimate-result success';
            resultDiv.innerHTML = `<span class="fa fa-check-circle"></span> ${successCount} devis créé(s) avec succès !`;
        } else if (successCount === 0) {
            resultDiv.className = 'bulk-estimate-result error';
            resultDiv.innerHTML = `<span class="fa fa-times-circle"></span> Échec de la création des ${errorCount} devis`;
        } else {
            resultDiv.className = 'bulk-estimate-result partial';
            resultDiv.innerHTML = `<span class="fa fa-exclamation-triangle"></span> ${successCount} succès, ${errorCount} erreur(s)`;
        }

        const cancelBtn = document.getElementById('bulk-estimate-cancel');
        cancelBtn.innerHTML = '<span class="fa fa-check"></span> Fermer et rafraîchir';
        cancelBtn.onclick = () => {
            closeModal();
            location.reload();
        };
    }

    // Init
    function init() {
        clientId = getClientId();
        injectStyles();
        createModal();
        createTriggerButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
