import { lucideIcons } from './icons';

export interface MenuItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  avatarUrl?: string;
  badge?: string;
  selected?: boolean;
  danger?: boolean;
  action?: () => void;
}

export interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
  avatarUrl?: string;
  badge?: string;
}

export function closeAllCustomMenus(): void {
  document.querySelectorAll('.gh-custom-menu-popover').forEach((el) => el.remove());
}

export function openCustomMenu(
  anchorEl: HTMLElement,
  title: string,
  items: MenuItem[],
  onSelect?: (id: string) => void
): void {
  closeAllCustomMenus();

  const menu = document.createElement('div');
  menu.className = 'gh-custom-menu-popover';

  const headerHtml = title ? `<div class="gh-custom-menu-header">${title}</div>` : '';

  const itemsHtml = items
    .map(
      (item) => `
    <div class="gh-custom-menu-item ${item.selected ? 'selected' : ''} ${item.danger ? 'danger' : ''}" data-id="${item.id}">
      <div class="gh-menu-item-left">
        ${
          item.avatarUrl
            ? `<img src="${item.avatarUrl}" class="gh-menu-item-avatar" alt="">`
            : item.icon
            ? `<span class="gh-menu-item-icon">${item.icon}</span>`
            : ''
        }
        <div class="gh-menu-item-text">
          <span class="gh-menu-item-label">${item.label}</span>
          ${item.sublabel ? `<span class="gh-menu-item-sublabel">${item.sublabel}</span>` : ''}
        </div>
      </div>
      <div class="gh-menu-item-right">
        ${item.badge ? `<span class="gh-badge">${item.badge}</span>` : ''}
        ${item.selected ? `<span class="gh-menu-item-check">${lucideIcons.check}</span>` : ''}
      </div>
    </div>
  `
    )
    .join('');

  menu.innerHTML = `
    ${headerHtml}
    <div class="gh-custom-menu-list">
      ${itemsHtml}
    </div>
  `;

  document.body.appendChild(menu);

  // Position relative to anchor within viewport
  const rect = anchorEl.getBoundingClientRect();
  const menuWidth = Math.min(270, window.innerWidth - 16);
  let left = rect.left;
  if (left + menuWidth > window.innerWidth - 8) {
    left = window.innerWidth - menuWidth - 8;
  }
  if (left < 8) left = 8;

  let top = rect.bottom + 4;
  if (top + 240 > window.innerHeight && rect.top > 240) {
    top = rect.top - menu.offsetHeight - 4;
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.width = `${menuWidth}px`;

  // Item click handlers
  menu.querySelectorAll<HTMLElement>('.gh-custom-menu-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.id;
      const item = items.find((i) => i.id === id);
      closeAllCustomMenus();
      if (item?.action) item.action();
      if (onSelect && id) onSelect(id);
    });
  });

  // Close on outside click
  const handleOutsideClick = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
      closeAllCustomMenus();
      document.removeEventListener('click', handleOutsideClick, true);
    }
  };

  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, true);
  }, 10);
}

export class CustomSelectComponent {
  container: HTMLElement;
  triggerBtn: HTMLElement;
  dropdownEl: HTMLElement;
  options: DropdownOption[];
  selectedValue: string;
  prefixIcon: string;
  onChange: (value: string) => void;
  isOpen = false;

  constructor(config: {
    container: HTMLElement;
    id?: string;
    options: DropdownOption[];
    selectedValue: string;
    prefixIcon?: string;
    placeholder?: string;
    onChange: (value: string) => void;
  }) {
    this.container = config.container;
    this.options = config.options;
    this.selectedValue = config.selectedValue;
    this.prefixIcon = config.prefixIcon || '';
    this.onChange = config.onChange;

    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'gh-custom-select';
    if (config.id) wrapper.id = config.id;

    const currentOpt = this.options.find((o) => o.value === this.selectedValue) || this.options[0];
    const initialLabel = currentOpt ? currentOpt.label : config.placeholder || 'Select...';
    const initialIcon = currentOpt?.icon || this.prefixIcon;

    wrapper.innerHTML = `
      <button type="button" class="gh-custom-select-trigger" aria-haspopup="listbox">
        <span class="gh-custom-select-prefix">${initialIcon}</span>
        <span class="gh-custom-select-label">${initialLabel}</span>
        <span class="gh-custom-select-caret">${lucideIcons.chevronDown}</span>
      </button>
      <div class="gh-custom-select-dropdown" style="display: none;"></div>
    `;

    this.container.appendChild(wrapper);

    this.triggerBtn = wrapper.querySelector<HTMLElement>('.gh-custom-select-trigger')!;
    this.dropdownEl = wrapper.querySelector<HTMLElement>('.gh-custom-select-dropdown')!;

    this.renderDropdownItems();

    this.triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !wrapper.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  setOptions(options: DropdownOption[], selectedValue?: string): void {
    this.options = options;
    if (selectedValue !== undefined) {
      this.selectedValue = selectedValue;
    }
    this.updateTrigger();
    this.renderDropdownItems();
  }

  updateTrigger(): void {
    const currentOpt = this.options.find((o) => o.value === this.selectedValue) || this.options[0];
    const labelEl = this.triggerBtn.querySelector<HTMLElement>('.gh-custom-select-label');
    const prefixEl = this.triggerBtn.querySelector<HTMLElement>('.gh-custom-select-prefix');
    if (labelEl) labelEl.textContent = currentOpt ? currentOpt.label : 'Select...';
    if (prefixEl) prefixEl.innerHTML = currentOpt?.icon || this.prefixIcon;
  }

  renderDropdownItems(): void {
    if (this.options.length === 0) {
      this.dropdownEl.innerHTML = '<div class="gh-custom-select-empty">No options available</div>';
      return;
    }

    this.dropdownEl.innerHTML = this.options
      .map((opt) => {
        const isSelected = opt.value === this.selectedValue;
        return `
        <div class="gh-custom-select-option ${isSelected ? 'selected' : ''}" data-value="${opt.value}">
          <div class="gh-opt-left">
            ${
              opt.avatarUrl
                ? `<img src="${opt.avatarUrl}" class="gh-opt-avatar" alt="">`
                : opt.icon
                ? `<span class="gh-opt-icon">${opt.icon}</span>`
                : ''
            }
            <span class="gh-opt-label">${opt.label}</span>
          </div>
          ${isSelected ? `<span class="gh-opt-check">${lucideIcons.check}</span>` : ''}
        </div>
      `;
      })
      .join('');

    this.dropdownEl.querySelectorAll<HTMLElement>('.gh-custom-select-option').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = el.dataset.value;
        if (val !== undefined) {
          this.selectedValue = val;
          this.updateTrigger();
          this.close();
          this.onChange(val);
        }
      });
    });
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    // Close other dropdowns
    document.querySelectorAll<HTMLElement>('.gh-custom-select-dropdown').forEach((d) => {
      if (d !== this.dropdownEl) d.style.display = 'none';
    });
    this.dropdownEl.style.display = 'block';
    this.isOpen = true;
    this.triggerBtn.classList.add('active');
  }

  close(): void {
    this.dropdownEl.style.display = 'none';
    this.isOpen = false;
    this.triggerBtn.classList.remove('active');
  }
}
