class PDFMerger {
    constructor() {
        this.files = [];
        this.mergedPdf = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const clearBtn = document.getElementById('clearBtn');
        const mergeBtn = document.getElementById('mergeBtn');
        const downloadBtn = document.getElementById('downloadBtn');

        // File upload events
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Button events
        clearBtn.addEventListener('click', this.clearFiles.bind(this));
        mergeBtn.addEventListener('click', this.mergeFiles.bind(this));
        downloadBtn.addEventListener('click', this.downloadMergedPDF.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
        this.addFiles(files);
        e.target.value = ''; // Reset input
    }

    addFiles(newFiles) {
        newFiles.forEach(file => {
            // Check if file already exists
            const exists = this.files.some(existingFile => 
                existingFile.name === file.name && existingFile.size === file.size
            );
            
            if (!exists) {
                this.files.push({
                    id: Date.now() + Math.random(),
                    file: file,
                    name: file.name,
                    size: this.formatFileSize(file.size)
                });
            }
        });
        
        this.updateUI();
    }

    removeFile(fileId) {
        this.files = this.files.filter(file => file.id !== fileId);
        this.updateUI();
    }

    moveFile(fileId, direction) {
        const index = this.files.findIndex(file => file.id === fileId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= this.files.length) return;

        // Swap files
        [this.files[index], this.files[newIndex]] = [this.files[newIndex], this.files[index]];
        this.updateUI();
    }

    clearFiles() {
        this.files = [];
        this.mergedPdf = null;
        this.updateUI();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateUI() {
        const filesSection = document.getElementById('filesSection');
        const mergeSection = document.getElementById('mergeSection');
        const resultSection = document.getElementById('resultSection');
        const progressSection = document.getElementById('progressSection');
        
        // Reset all sections
        filesSection.classList.remove('show');
        mergeSection.classList.remove('show');
        resultSection.classList.remove('show');
        progressSection.classList.remove('show');

        if (this.files.length > 0) {
            filesSection.classList.add('show');
            this.renderFilesList();
            
            if (this.files.length > 1) {
                mergeSection.classList.add('show');
            }
        }

        if (this.mergedPdf) {
            resultSection.classList.add('show');
        }
    }

    renderFilesList() {
        const filesList = document.getElementById('filesList');
        filesList.innerHTML = '';

        this.files.forEach((fileData, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-pdf file-icon"></i>
                    <div class="file-details">
                        <h4>${fileData.name}</h4>
                        <p>${fileData.size}</p>
                    </div>
                </div>
                <div class="file-actions">
                    ${index > 0 ? `<button class="move-btn" onclick="pdfMerger.moveFile('${fileData.id}', 'up')" title="Move up">
                        <i class="fas fa-arrow-up"></i>
                    </button>` : ''}
                    ${index < this.files.length - 1 ? `<button class="move-btn" onclick="pdfMerger.moveFile('${fileData.id}', 'down')" title="Move down">
                        <i class="fas fa-arrow-down"></i>
                    </button>` : ''}
                    <button class="remove-btn" onclick="pdfMerger.removeFile('${fileData.id}')" title="Remove file">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            filesList.appendChild(fileItem);
        });
    }

    async mergeFiles() {
        if (this.files.length < 2) {
            this.showNotification('Please select at least 2 PDF files to merge.', 'error');
            return;
        }

        const mergeBtn = document.getElementById('mergeBtn');
        const progressSection = document.getElementById('progressSection');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        // Show progress
        progressSection.classList.add('show');
        mergeBtn.disabled = true;
        mergeBtn.innerHTML = '<div class="spinner"></div> Merging...';

        try {
            // Create a new PDF document
            const mergedPdf = await PDFLib.PDFDocument.create();
            
            for (let i = 0; i < this.files.length; i++) {
                const fileData = this.files[i];
                const progress = ((i + 1) / this.files.length) * 100;
                
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `Processing ${fileData.name}... (${i + 1}/${this.files.length})`;

                // Read the PDF file
                const arrayBuffer = await fileData.file.arrayBuffer();
                const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                
                // Copy pages from the current PDF to the merged PDF
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));

                // Add a small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            progressText.textContent = 'Finalizing PDF...';
            
            // Serialize the merged PDF
            this.mergedPdf = await mergedPdf.save();
            
            // Hide progress and show result
            progressSection.classList.remove('show');
            this.updateUI();
            
            this.showNotification('PDFs merged successfully!', 'success');
            
        } catch (error) {
            console.error('Error merging PDFs:', error);
            this.showNotification('Error merging PDFs. Please try again.', 'error');
            progressSection.classList.remove('show');
        } finally {
            mergeBtn.disabled = false;
            mergeBtn.innerHTML = '<i class="fas fa-magic"></i> <span>Merge PDFs</span>';
        }
    }

    downloadMergedPDF() {
        if (!this.mergedPdf) {
            this.showNotification('No merged PDF available for download.', 'error');
            return;
        }

        const outputName = document.getElementById('outputName').value.trim() || 'merged-document';
        const fileName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
        
        // Create download link
        const blob = new Blob([this.mergedPdf], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        this.showNotification(`Downloaded: ${fileName}`, 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles for notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the PDF Merger when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pdfMerger = new PDFMerger();
});

// Add some utility styles for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-content i {
        font-size: 1.25rem;
    }
`;
document.head.appendChild(notificationStyles);
