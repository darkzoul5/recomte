// Multi-select dropdown with checkboxes
class MultiSelectDropdown {
  constructor(selectElement) {
    this.select = selectElement;
    this.name = selectElement.name;
    // Skip the first empty option if it exists
    this.options = Array.from(selectElement.options)
      .filter(opt => opt.value)
      .map(opt => ({
        value: opt.value,
        label: opt.textContent,
        selected: opt.selected,
        optionElement: opt
      }));
    
    this.render();
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'multi-select-container';
    container.style.cssText = 'position: relative; display: inline-block; width: 100%;';
    
    // Hide original select
    this.select.style.display = 'none';
    
    // Create button/label
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'multi-select-button';
    button.textContent = this.getButtonText();
    button.style.cssText = `
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #dbdbdb;
      border-radius: 4px;
      background-color: #fff;
      text-align: left;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const arrow = document.createElement('span');
    arrow.textContent = '▼';
    arrow.style.cssText = 'font-size: 0.75rem; margin-left: 0.5rem;';
    button.appendChild(arrow);
    
    // Create dropdown menu
    const menu = document.createElement('div');
    menu.className = 'multi-select-menu';
    menu.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #dbdbdb;
      border-top: none;
      max-height: 250px;
      overflow-y: auto;
      display: none;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    this.options.forEach((opt) => {
      const label = document.createElement('label');
      label.style.cssText = `
        display: flex;
        align-items: center;
        padding: 0.5rem;
        cursor: pointer;
        border-bottom: 1px solid #f5f5f5;
      `;
      label.onmouseover = () => label.style.backgroundColor = '#f9f9f9';
      label.onmouseout = () => label.style.backgroundColor = 'transparent';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = opt.value;
      checkbox.checked = opt.selected;
      checkbox.style.cssText = 'margin-right: 0.75rem; cursor: pointer;';
      checkbox.onchange = () => this.updateValues();
      
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(opt.label));
      menu.appendChild(label);
    });
    
    // Toggle menu
    button.onclick = (e) => {
      e.preventDefault();
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    };
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
    
    container.appendChild(button);
    container.appendChild(menu);
    this.select.parentNode.insertBefore(container, this.select);
    
    this.button = button;
    this.menu = menu;
  }
  
  getButtonText() {
    const selected = this.options.filter(opt => opt.selected);
    if (selected.length === 0) return '-- Не выбрано --';
    if (selected.length === 1) return selected[0].label;
    return `Выбрано: ${selected.length}`;
  }
  
  updateValues() {
    const checkboxes = this.menu.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
      if (this.options[index]) {
        this.options[index].selected = checkbox.checked;
        this.options[index].optionElement.selected = checkbox.checked;
      }
    });
    this.button.textContent = this.getButtonText();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  const multiSelects = document.querySelectorAll('select[multiple]');
  multiSelects.forEach(select => {
    new MultiSelectDropdown(select);
  });
});
