// JavaScript 逻辑保持不变

// 导出页签数据为JSON文件
function exportFile() {
    const data = JSON.stringify(categories);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
}

// 从JSON文件导入页签数据
function importFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // 数据格式兼容转换
                let importedCategories;
                if (importedData.version === 3) {
                    importedCategories = importedData.lists.map(list => ({
                        name: list.title,
                        tags: list.cards.map(card => ({
                            name: card.customTitle || card.title,
                            url: card.url,
                            note: card.customDescription
                        })),
                        isDefault: false
                    }));
                } else if (Array.isArray(importedData) && importedData.some(c => c.tags)) {
                    importedCategories = importedData;
                } else {
                    throw new Error('文件格式不兼容');
                }

                // 保存导入数据到临时变量，用于后续处理
                window.importedTemp = {
                    importedCategories,
                    file
                };

                // 获取现有数据
                const existingCategories = JSON.parse(localStorage.getItem('categories')) || [];
                const nonDefaultExisting = existingCategories.filter(c => !c.isDefault);
                
                // 检查是否有重名类目
                const duplicateNames = [];
                importedCategories.forEach(importCat => {
                    if (!importCat.isDefault && nonDefaultExisting.some(existCat => existCat.name === importCat.name)) {
                        duplicateNames.push(importCat.name);
                    }
                });
                
                if (duplicateNames.length > 0) {
                    // 有重名类目，显示选择对话框
                    document.getElementById('duplicateModal').classList.add('active');
                    document.getElementById('overlay').classList.add('active');
                } else {
                    // 无重名类目，直接处理导入
                    processCategoryImport('rename');
                }
            } catch (error) {
                alert(`导入失败：${error.message || '文件格式不正确'}\n建议导出当前数据备份后再尝试导入`);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 处理重名类目的用户选择
function handleDuplicateChoice(choice) {
    closeModal(); // 关闭选择对话框
    processCategoryImport(choice);
}

// 根据用户选择处理导入
function processCategoryImport(choice) {
    if (!window.importedTemp) return;
    
    const { importedCategories } = window.importedTemp;
    
    // 获取现有数据
    const existingCategories = JSON.parse(localStorage.getItem('categories')) || [];
    const existingDefaultCategory = existingCategories.find(c => c.isDefault) || { name: "全部", tags: [], isDefault: true };
    const nonDefaultExisting = existingCategories.filter(c => !c.isDefault);
    
    let mergedData;
    
    if (choice === 'cancel') {
        // 取消导入
        window.importedTemp = null;
        return;
    } else if (choice === 'merge') {
        // 合并重名类目
        mergedData = [existingDefaultCategory];
        
        // 处理所有非默认类目
        nonDefaultExisting.forEach(existCat => {
            // 查找是否有重名的导入类目
            const matchImport = importedCategories.find(importCat => 
                !importCat.isDefault && importCat.name === existCat.name);
            
            if (matchImport) {
                // 合并标签，避免重复
                const existingUrls = existCat.tags.map(tag => tag.url);
                const newTags = matchImport.tags.filter(tag => !existingUrls.includes(tag.url));
                existCat.tags = [...existCat.tags, ...newTags];
            }
            
            mergedData.push(existCat);
        });
        
        // 添加没有重名的导入类目
        importedCategories.forEach(importCat => {
            if (!importCat.isDefault && !nonDefaultExisting.some(existCat => existCat.name === importCat.name)) {
                mergedData.push(importCat);
            }
        });
    } else {
        // 不合并，为重名类目添加序号
        mergedData = [existingDefaultCategory, ...nonDefaultExisting];
        
        // 处理导入的类目，为重名类目添加序号
        importedCategories.forEach(importCat => {
            if (!importCat.isDefault) {
                let newName = importCat.name;
                let counter = 1;
                
                // 检查名称是否已存在，如果存在则添加序号
                while (mergedData.some(c => c.name === newName)) {
                    newName = `${importCat.name}-${counter}`;
                    counter++;
                }
                
                mergedData.push({
                    ...importCat,
                    name: newName
                });
            }
        });
    }
    
    // 保存合并后的数据
    localStorage.setItem('categories', JSON.stringify(mergedData));
    categories = mergedData;
    renderCategories();
    
    // 清理临时数据
    window.importedTemp = null;
    
    // 显示导入成功消息
    alert(`导入成功！共有${mergedData.length - 1}个类目`);
}

let categories = JSON.parse(localStorage.getItem('categories') || '[]');
if (!Array.isArray(categories)) {
    categories = [];
}
let currentCategory = null;
let editingTag = null;

// 检查已有数据，确保存在默认分组
let hasDefaultGroup = false;
for (let i = 0; i < categories.length; i++) {
    if (categories[i].isDefault) {
        // 如果是默认分组，名称改为"全部"
        if (categories[i].name === "默认分组") {
            categories[i].name = "全部";
            localStorage.setItem('categories', JSON.stringify(categories));
        }
        hasDefaultGroup = true;
        break;
    }
}

// 如果没有默认分组，添加一个（如果已有分组，则将第一个设为默认；否则创建新的）
if (!hasDefaultGroup) {
    // 确保始终创建独立的'全部'分类
    categories.unshift({ name: "全部", tags: [], isDefault: true });
    localStorage.setItem('categories', JSON.stringify(categories));
}

// 拖放事件处理函数
let dragStartIndex;
let dragElement = null;
let autoScrollInterval = null; // 自动滚动定时器

function handleDragStart(e) {
    dragStartIndex = +e.target.dataset.index; // 获取拖动项的索引
    dragElement = e.target;
    
    // 添加拖拽样式前先添加预备类，触发启动动画
    e.target.classList.add('drag-start');
    
    // 延迟添加真正的拖拽类，创造平滑过渡效果
    setTimeout(() => {
        // 添加拖拽样式
        e.target.classList.add('dragging');
        e.target.classList.remove('drag-start');
        
        // 为其他项目添加"可放置"的视觉提示，添加逐个显示的动画效果
        const dropTargets = document.querySelectorAll('#categoryList li:not(.dragging):not([data-index="0"])');
        dropTargets.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('drop-target');
            }, index * 30); // 每个元素延迟30ms显示，创造波浪效应
        });
    }, 50);
    
    // 设置拖拽图像为半透明
    // 创建自定义拖拽图像效果
    const ghostElement = e.target.cloneNode(true);
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = '-1000px';
    ghostElement.style.opacity = '0';
    document.body.appendChild(ghostElement);
    
    // 使用空白图像作为拖拽图像，以使用我们的自定义样式
    e.dataTransfer.setDragImage(ghostElement, 0, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', null); // 必须设置数据，否则拖放无效
    
    // 延迟移除临时元素
    setTimeout(() => {
        document.body.removeChild(ghostElement);
    }, 0);
    
    // 添加禁止拖放样式到默认类目
    if (categories[0].isDefault) {
        const defaultItem = document.querySelector('#categoryList li[data-index="0"]');
        if (defaultItem) {
            defaultItem.classList.add('drop-disabled');
        }
    }
    
    // 启动拖拽时监听document上的拖拽事件，用于自动滚动
    document.addEventListener('dragover', handleDocumentDragOver);
}

// 处理整个文档的拖动事件，用于自动滚动
function handleDocumentDragOver(e) {
    const sidebar = document.querySelector('.sidebar-scroll');
    if (!sidebar) return;
    
    const sidebarRect = sidebar.getBoundingClientRect();
    const scrollSpeed = 5; // 滚动速度
    const scrollSensitiveArea = 40; // 敏感区域大小（像素）
    
    // 清除之前的自动滚动定时器
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    
    // 判断鼠标位置并设置滚动方向
    if (e.clientY < sidebarRect.top + scrollSensitiveArea) {
        // 鼠标在顶部敏感区域，向上滚动
        autoScrollInterval = setInterval(() => {
            sidebar.scrollTop -= scrollSpeed;
        }, 10);
    } else if (e.clientY > sidebarRect.bottom - scrollSensitiveArea) {
        // 鼠标在底部敏感区域，向下滚动
        autoScrollInterval = setInterval(() => {
            sidebar.scrollTop += scrollSpeed;
        }, 10);
    }
}

function clearDragClasses() {
    // 清除所有拖拽相关的类
    document.querySelectorAll('#categoryList li').forEach(item => {
        item.classList.remove('dragging-over-top', 'dragging-over-bottom', 'drop-disabled', 'dropped', 'drop-target', 'shift-up', 'shift-down', 'swap-positions');
    });
}

function handleDragOver(e) {
    e.preventDefault(); // 允许放置
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.target.closest('li');
    if (!target || target === dragElement) return; // 如果没有目标或者目标就是被拖拽元素，则返回
    
    // 清除先前的拖拽提示样式
    clearDragClasses();
    
    // 如果拖动到默认类目（全部）上，不允许放置
    if (target.dataset.index === '0' && categories[0].isDefault) {
        target.classList.add('drop-disabled');
        return;
    }
    
    const rect = target.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    
    // 获取周围的项目进行精细化的挤开效果
    const currentIndex = parseInt(dragElement.dataset.index);
    const targetIndex = parseInt(target.dataset.index);
    
    // 添加更多元素的挤开效果
    if (offset < rect.height / 2) {
        // 显示将在目标上方插入
        target.classList.add('dragging-over-top');
        
        // 如果目标在拖动元素上方，添加上移动画
        if (targetIndex < currentIndex) {
            // 对目标及附近的元素应用梯度挤开效果
            const siblings = Array.from(document.querySelectorAll('#categoryList li:not(.dragging)'));
            const targetPos = siblings.indexOf(target);
            
            // 为目标周围的元素添加不同程度的位移效果
            for (let i = 0; i < siblings.length; i++) {
                const distance = Math.abs(i - targetPos);
                if (distance <= 2) { // 只影响距离目标2个位置内的元素
                    const intensity = 1 - (distance * 0.3); // 距离越近，效果越强
                    siblings[i].style.setProperty('--shift-intensity', intensity);
                    siblings[i].classList.add('shift-up');
                    
                    // 为每个元素设置随机的微小延迟，使效果更自然
                    const randomDelay = Math.random() * 50;
                    setTimeout(() => {
                        siblings[i].classList.remove('shift-up');
                        siblings[i].style.removeProperty('--shift-intensity');
                    }, 400 + randomDelay);
                }
            }
        }
        
        // 动态重排 DOM
        if (dragElement.nextElementSibling !== target) {
            target.parentNode.insertBefore(dragElement, target);
            
            // 为拖动元素的前后元素添加交换动画
            if (dragElement.previousElementSibling && dragElement.previousElementSibling !== target) {
                dragElement.previousElementSibling.classList.add('swap-positions');
                setTimeout(() => {
                    if (dragElement.previousElementSibling)
                        dragElement.previousElementSibling.classList.remove('swap-positions');
                }, 500);
            }
        }
    } else {
        // 显示将在目标下方插入
        target.classList.add('dragging-over-bottom');
        
        // 如果目标在拖动元素下方，添加下移动画
        if (targetIndex > currentIndex) {
            // 对目标及附近的元素应用梯度挤开效果
            const siblings = Array.from(document.querySelectorAll('#categoryList li:not(.dragging)'));
            const targetPos = siblings.indexOf(target);
            
            // 为目标周围的元素添加不同程度的位移效果
            for (let i = 0; i < siblings.length; i++) {
                const distance = Math.abs(i - targetPos);
                if (distance <= 2) { // 只影响距离目标2个位置内的元素
                    const intensity = 1 - (distance * 0.3); // 距离越近，效果越强
                    siblings[i].style.setProperty('--shift-intensity', intensity);
                    siblings[i].classList.add('shift-down');
                    
                    // 为每个元素设置随机的微小延迟，使效果更自然
                    const randomDelay = Math.random() * 50;
                    setTimeout(() => {
                        siblings[i].classList.remove('shift-down');
                        siblings[i].style.removeProperty('--shift-intensity');
                    }, 400 + randomDelay);
                }
            }
        }
        
        // 动态重排 DOM
        if (dragElement !== target.nextElementSibling) {
            target.parentNode.insertBefore(dragElement, target.nextElementSibling);
            
            // 为拖动元素的前后元素添加交换动画
            if (dragElement.nextElementSibling) {
                dragElement.nextElementSibling.classList.add('swap-positions');
                setTimeout(() => {
                    if (dragElement.nextElementSibling)
                        dragElement.nextElementSibling.classList.remove('swap-positions');
                }, 500);
            }
        }
    }
}

function handleDragEnd(e) {
    // 停止自动滚动
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    
    // 移除文档级拖拽事件监听
    document.removeEventListener('dragover', handleDocumentDragOver);
    
    // 创建更平滑的结束动画序列
    if (dragElement) {
        // 先添加结束前的状态类
        dragElement.classList.add('drag-ending');
        dragElement.classList.remove('dragging');
        
        // 创建顺序动画
        setTimeout(() => {
            // 添加放置动画类
            dragElement.classList.remove('drag-ending');
            dragElement.classList.add('dropped');
            
            // 为周围元素添加"欢迎"动画
            const siblings = dragElement.parentNode.children;
            for (let i = 0; i < siblings.length; i++) {
                if (siblings[i] !== dragElement) {
                    siblings[i].classList.add('neighbor-dropped');
                    setTimeout(() => {
                        siblings[i].classList.remove('neighbor-dropped');
                    }, 500);
                }
            }
            
            // 延迟移除放置动画类
            setTimeout(() => {
                if (dragElement) {
                    dragElement.classList.remove('dropped');
                }
            }, 700);
        }, 100);
    }
    
    // 平滑移除其他拖拽类
    const dropTargets = document.querySelectorAll('#categoryList li.drop-target');
    dropTargets.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('fade-out-target');
            setTimeout(() => {
                item.classList.remove('drop-target');
                item.classList.remove('fade-out-target');
            }, 300);
        }, index * 50);
    });
    
    // 最后再统一清除所有拖拽相关的类
    setTimeout(() => {
        clearDragClasses();
        dragElement = null;
    }, 800);
}

function handleDrop(e) {
    e.preventDefault();
    
    // 停止自动滚动
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    
    // 移除文档级拖拽事件监听
    document.removeEventListener('dragover', handleDocumentDragOver);
    
    // 获取实际的放置索引
    const categoryItems = Array.from(document.querySelectorAll('#categoryList li'));
    const newIndex = categoryItems.indexOf(dragElement);
    
    // 记录当前选中类目的名称，用于后续重新选择
    const currentSelectedName = categories[currentCategory]?.name;
    
    // 清除拖拽样式
    if (dragElement) {
        dragElement.classList.remove('dragging');
        // 添加放置动画类
        dragElement.classList.add('dropped');
        // 延迟移除放置动画类
        setTimeout(() => {
            if (dragElement) {
                dragElement.classList.remove('dropped');
            }
        }, 500);
    }
    clearDragClasses();
    
    // 如果索引有改变，更新数据
    if (dragStartIndex !== newIndex && newIndex !== -1) {
        // 更新 categories 数组的顺序
        const [draggedItem] = categories.splice(dragStartIndex, 1);
        categories.splice(newIndex, 0, draggedItem);
        
        // 确保默认分组（全部）始终在第一位
        const defaultCategoryIndex = categories.findIndex(c => c.isDefault);
        if (defaultCategoryIndex !== 0) {
            const defaultCategory = categories.splice(defaultCategoryIndex, 1)[0];
            categories.unshift(defaultCategory);
        }
        
        localStorage.setItem('categories', JSON.stringify(categories));
        
        // 不需要重新渲染整个列表，仅更新数据
        // 重新设置索引
        categoryItems.forEach((item, index) => {
            item.dataset.index = index;
        });
        
        // 通过名称找到当前选中类目的新索引
        if (currentSelectedName) {
            const newSelectedIndex = categories.findIndex(cat => cat.name === currentSelectedName);
            if (newSelectedIndex !== -1) {
                // 确保UI和状态同步
                currentCategory = newSelectedIndex;
                // 更新选中样式
                const items = document.querySelectorAll('#categoryList li');
                for (let i = 0; i < items.length; i++) {
                    items[i].classList.remove('selected');
                }
                if (items[newSelectedIndex]) {
                    items[newSelectedIndex].classList.add('selected');
                }
            }
        }
    }
    
    dragElement = null;
}

function renderCategories() {
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    categories.forEach((category, index) => {
        const li = document.createElement('li');
        // 只有非默认类目才可拖动
        li.draggable = !category.isDefault; // 默认类目（全部）不可拖动
        li.dataset.index = index; // 存储当前项的索引
        
        // 创建类目名称容器
        const nameContainer = document.createElement('span');
        nameContainer.className = 'category-name';
        nameContainer.textContent = category.name;
        li.appendChild(nameContainer);
        
        // 设置点击事件
        li.onclick = () => switchCategory(index);

        // 只为非默认类目添加拖放事件监听器
        if (!category.isDefault) {
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('dragend', handleDragEnd);
            li.addEventListener('drop', handleDrop);
        }

        categoryList.appendChild(li);
    });

    // 如果有类目，则默认选中第一个类目
    if (categories.length > 0) {
        switchCategory(0);
    }
}

function switchCategory(index) {
    if (currentCategory === index) return; // 如果已经是当前类目，则不做任何操作
    
    const categoryList = document.getElementById('categoryList');
    const items = categoryList.getElementsByTagName('li');
    
    if (currentCategory !== null && currentCategory < items.length) {
        items[currentCategory].classList.remove('selected');
    }
    
    items[index].classList.add('selected');
    currentCategory = index;
    document.getElementById('currentCategory').textContent = categories[index].name;
    
    // 更新更多按钮的可见性
    updateMoreButtonVisibility();
    
    renderTags();
}

function openCategoryModal() {
    document.getElementById('categoryModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function openTagModal() {
    // 清空输入框内容，仅在添加新标签时(非编辑模式)
    if (editingTag === null) {
        document.getElementById('tagNameInput').value = '';
        document.getElementById('tagUrlInput').value = '';
        document.getElementById('tagNoteInput').value = '';
        document.getElementById('tagModal').querySelector('h3').textContent = '添加标签';
    }
    document.getElementById('tagModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('tagModal').classList.remove('active');
    document.getElementById('duplicateModal').classList.remove('active');
    document.getElementById('renameModal').classList.remove('active');
    document.getElementById('deleteModal').classList.remove('active');
    document.getElementById('deleteTagModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    // 重置表单和编辑状态
    document.getElementById('categoryInput').value = '';
    editingTag = null;
}

function saveCategory() {
    const categoryName = document.getElementById('categoryInput').value;
    if (categoryName) {
        // 确保新类目不会覆盖默认分组
        const newCategory = { name: categoryName, tags: [], isDefault: false };
        categories.push(newCategory);
        
        // 确保默认分组在第一个位置
        const defaultCategoryIndex = categories.findIndex(c => c.isDefault);
        if (defaultCategoryIndex !== 0) {
            const defaultCategory = categories.splice(defaultCategoryIndex, 1)[0];
            categories.unshift(defaultCategory);
        }
        
        localStorage.setItem('categories', JSON.stringify(categories));
        renderCategories();
        closeModal();
    }
}

// URL 验证函数
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

function saveTag() {
    const tagName = document.getElementById('tagNameInput').value.trim();
    const tagUrl = document.getElementById('tagUrlInput').value.trim();
    const tagNote = document.getElementById('tagNoteInput').value.trim();
    
    if (!tagName) {
        alert('请输入网站名称');
        return;
    }
    
    if (!tagUrl) {
        alert('请输入网站地址');
        return;
    }
    
    if (!isValidUrl(tagUrl)) {
        alert('请输入有效的网址，例如: https://www.example.com');
        return;
    }
    
    if (editingTag !== null) {
        categories[currentCategory].tags[editingTag] = { name: tagName, url: tagUrl, note: tagNote }; // 更新备注字段
    } else {
        categories[currentCategory].tags.push({ name: tagName, url: tagUrl, note: tagNote }); // 添加备注字段
    }
    localStorage.setItem('categories', JSON.stringify(categories));
    
    renderTags();
    closeModal();
    
    // 清空表单，以便下次添加
    document.getElementById('tagNameInput').value = '';
    document.getElementById('tagUrlInput').value = '';
    document.getElementById('tagNoteInput').value = '';
}

function editTag(index) {
    editingTag = index;
    const tag = categories[currentCategory].tags[index];
    document.getElementById('tagNameInput').value = tag.name;
    document.getElementById('tagUrlInput').value = tag.url;
    document.getElementById('tagNoteInput').value = tag.note || ''; // 回显备注信息
    document.getElementById('tagModal').querySelector('h3').textContent = '编辑标签'; // 修改弹窗标题
    openTagModal();
}

function deleteTag(index) {
    // 保存当前编辑的标签索引
    editingTag = index;
    // 显示删除确认弹窗
    document.getElementById('deleteTagModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

// 确认删除标签
function confirmDeleteTag() {
    if (editingTag !== null) {
        categories[currentCategory].tags.splice(editingTag, 1);
        localStorage.setItem('categories', JSON.stringify(categories));
        renderTags();
        editingTag = null;
    }
    closeModal();
}

function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    // 获取两个 SVG 图标元素
    const lightModeIcon = document.getElementById('light-mode-icon');
    const darkModeIcon = document.getElementById('dark-mode-icon');
    
    if (body.classList.contains('dark-mode')) {
        // 深色模式：隐藏浅色图标，显示深色图标
        lightModeIcon.style.display = 'none';
        darkModeIcon.style.display = 'block';
        localStorage.setItem('darkMode', 'true');
    } else {
        // 浅色模式：隐藏深色图标，显示浅色图标
        lightModeIcon.style.display = 'block';
        darkModeIcon.style.display = 'none';
        localStorage.setItem('darkMode', 'false');
    }
}

// 页面加载时检查深色模式状态
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    document.getElementById('light-mode-icon').style.display = 'none'; // 隐藏浅色图标
    document.getElementById('dark-mode-icon').style.display = 'block'; // 显示深色图标
} else {
    document.getElementById('light-mode-icon').style.display = 'block'; // 显示浅色图标
    document.getElementById('dark-mode-icon').style.display = 'none'; // 隐藏深色图标
}

// 根据输入字符串生成一个随机但固定的颜色
function getRandomColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

document.addEventListener('DOMContentLoaded', function() {
    renderCategories();
});

// 更多按钮和下拉菜单功能
document.addEventListener('DOMContentLoaded', function() {
    const moreBtn = document.getElementById('moreBtn');
    const categoryDropdown = document.getElementById('categoryDropdown');
    const categoryActions = document.getElementById('categoryActions');
    
    // 首次加载时初始化更多按钮状态
    updateMoreButtonVisibility();
    
    // 点击更多按钮显示/隐藏下拉菜单
    moreBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        categoryDropdown.classList.toggle('active');
    });
    
    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', function(e) {
        if (!categoryDropdown.contains(e.target) && !moreBtn.contains(e.target)) {
            categoryDropdown.classList.remove('active');
        }
    });
    
    // 阻止下拉菜单内部点击事件冒泡
    categoryDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
});

// 更新更多按钮的可见性
function updateMoreButtonVisibility() {
    const categoryActions = document.getElementById('categoryActions');
    const currentCategory = document.getElementById('currentCategory').textContent;
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const category = categories.find(cat => cat.name === currentCategory);
    
    // 如果是默认类目（"全部"），不显示更多按钮
    if (category && category.isDefault) {
        categoryActions.style.display = 'none';
    } else {
        categoryActions.style.display = 'block';
    }
}

// 重命名类目 - 打开自定义弹窗
function renameCategory() {
    const currentCategory = document.getElementById('currentCategory').textContent;
    document.getElementById('renameInput').value = currentCategory;
    
    // 显示重命名弹窗
    document.getElementById('renameModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    
    // 关闭下拉菜单
    document.getElementById('categoryDropdown').classList.remove('active');
}

// 保存重命名
function saveRenameCategory() {
    const currentCategoryName = document.getElementById('currentCategory').textContent;
    const newName = document.getElementById('renameInput').value.trim();
    
    if (newName !== '') {
        const categories = JSON.parse(localStorage.getItem('categories') || '[]');
        const categoryIndex = categories.findIndex(cat => cat.name === currentCategoryName);
        
        if (categoryIndex !== -1) {
            // 检查是否重名
            if (categories.some(cat => cat.name === newName && cat.name !== currentCategoryName)) {
                alert('该名称已存在，请使用其他名称！');
                return;
            }
            
            categories[categoryIndex].name = newName;
            localStorage.setItem('categories', JSON.stringify(categories));
            
            // 更新显示
            document.getElementById('currentCategory').textContent = newName;
            renderCategories();
            
            // 重新选中当前类目
            switchCategory(categoryIndex);
        }
    }
    
    closeModal();
}

// 删除类目 - 打开自定义弹窗
function deleteCategory() {
    // 显示删除确认弹窗
    document.getElementById('deleteModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    
    // 关闭下拉菜单
    document.getElementById('categoryDropdown').classList.remove('active');
}

// 确认删除类目
function confirmDeleteCategory() {
    const currentCategoryName = document.getElementById('currentCategory').textContent;
    const categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const categoryIndex = categories.findIndex(cat => cat.name === currentCategoryName);
    
    if (categoryIndex !== -1) {
        // 获取默认类目索引（应该是0）
        const defaultCategoryIndex = categories.findIndex(cat => cat.isDefault);
        
        if (defaultCategoryIndex !== -1) {
            // 将要删除类目的标签移动到默认类目
            if (categories[categoryIndex].tags && categories[categoryIndex].tags.length > 0) {
                if (!categories[defaultCategoryIndex].tags) {
                    categories[defaultCategoryIndex].tags = [];
                }
                categories[defaultCategoryIndex].tags = [
                    ...categories[defaultCategoryIndex].tags,
                    ...categories[categoryIndex].tags
                ];
            }
            
            // 删除类目
            categories.splice(categoryIndex, 1);
            localStorage.setItem('categories', JSON.stringify(categories));
            
            // 重新渲染并切换到默认类目
            renderCategories();
            switchCategory(defaultCategoryIndex);
        }
    }
    
    closeModal();
}

function renderTags() {
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.innerHTML = '';
    
    if (currentCategory === null) {
        cardContainer.innerHTML = '<div class="empty-state">请先选择或创建一个类目</div>';
        return;
    }
    
    const category = categories[currentCategory];
    
    // 处理"全部"分组的情况
    if (category.isDefault) {
        // 判断所有分组是否都没有标签
        let allEmpty = true;
        for (let i = 0; i < categories.length; i++) {
            if (!categories[i].isDefault && categories[i].tags && categories[i].tags.length > 0) {
                allEmpty = false;
                break;
            }
        }
        
        if (allEmpty) {
            // 如果没有任何标签，显示空状态提示
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = '暂无标签，请在其他分组中添加标签';
            cardContainer.appendChild(emptyState);
            return;
        }
        
        // 遍历所有非默认分组，按类目分组展示
        for (let i = 0; i < categories.length; i++) {
            if (!categories[i].isDefault && categories[i].tags && categories[i].tags.length > 0) {
                // 创建分组标题
                const groupTitle = document.createElement('div');
                groupTitle.className = 'group-title';
                groupTitle.textContent = categories[i].name;
                cardContainer.appendChild(groupTitle);
                
                // 添加该分组下的所有标签
                categories[i].tags.forEach(tag => {
                    // 在"全部"分组下创建没有编辑功能的卡片
                    const card = document.createElement('div');
                    card.className = 'card';
                    
                    // 创建 Logo
                    const logo = document.createElement('img');
                    logo.className = 'logo';
                    
                    try {
                        // 提取域名
                        const hostname = new URL(tag.url).hostname;
                        // 尝试从Google的favicon服务获取图标
                        logo.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
                        // 备用方案
                        logo.onerror = () => {
                            // 如果无法从Google获取，设置一个纯色背景和文字作为替代
                            logo.style.display = 'flex';
                            logo.style.justifyContent = 'center';
                            logo.style.alignItems = 'center';
                            logo.style.backgroundColor = getRandomColor(tag.name);
                            logo.style.color = '#ffffff';
                            logo.style.fontSize = '20px';
                            logo.style.fontWeight = 'bold';
                            logo.style.textAlign = 'center';
                            // 使用网站名称的第一个字符作为图标
                            logo.textContent = tag.name.charAt(0).toUpperCase();
                            // 防止重复触发onerror事件
                            logo.onerror = null;
                        };
                    } catch (e) {
                        // 如果URL解析失败，默认使用文字作为图标
                        logo.style.display = 'flex';
                        logo.style.justifyContent = 'center';
                        logo.style.alignItems = 'center';
                        logo.style.backgroundColor = getRandomColor(tag.name);
                        logo.style.color = '#ffffff';
                        logo.style.fontSize = '20px';
                        logo.style.fontWeight = 'bold';
                        logo.style.textAlign = 'center';
                        logo.textContent = tag.name.charAt(0).toUpperCase();
                    }
                    
                    card.appendChild(logo);
                    
                    // 信息容器
                    const infoContainer = document.createElement('div');
                    infoContainer.className = 'info-container';
                    infoContainer.innerHTML = `
                        <div class="tag-name">${tag.name}</div>
                        <div class="tag-url">${tag.note ? tag.note : (tag.url.length > 30 ? tag.url.substring(0, 30) + '...' : tag.url)}</div>
                    `;
                    card.appendChild(infoContainer);
                    
                    // 绑定卡片点击事件
                    card.onclick = () => {
                        window.open(tag.url, '_blank');
                    };
                    
                    cardContainer.appendChild(card);
                });
            }
        }
        
        return;
    }
    
    // 非"全部"分组的处理逻辑
    // 添加"添加标签"卡片
    const addCard = document.createElement('div');
    addCard.className = 'card add-card';
    addCard.onclick = openTagModal;
    
    // 创建加号图标和文字的容器
    const addContent = document.createElement('div');
    addContent.className = 'add-content';
    
    // 创建加号图标
    const addIcon = document.createElement('i');
    addIcon.className = 'ri-add-line';
    
    // 创建文字说明
    const addText = document.createElement('div');
    addText.className = 'add-text';
    addText.textContent = '添加标签';
    
    addContent.appendChild(addIcon);
    addContent.appendChild(addText);
    addCard.appendChild(addContent);
    
    if (category.tags.length === 0) {
        // 只显示添加标签卡片，不显示空状态提示
        cardContainer.appendChild(addCard);
        return;
    }
    
    category.tags.forEach((tag, index) => {
        const card = createTagCard(tag, currentCategory, index);
        cardContainer.appendChild(card);
    });

    // 在标签列表后添加"添加标签"卡片
    cardContainer.appendChild(addCard);
}

// 抽取标签卡片创建逻辑为单独函数
function createTagCard(tag, categoryIndex, tagIndex) {
    const card = document.createElement('div');
    card.className = 'card';
    if (tagIndex !== undefined) {
        card.dataset.index = tagIndex;
    }
    
    // 创建 Logo
    const logo = document.createElement('img');
    logo.className = 'logo';
    
    try {
        // 提取域名
        const hostname = new URL(tag.url).hostname;
        // 尝试从Google的favicon服务获取图标
        logo.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
        // 备用方案
        logo.onerror = () => {
            // 如果无法从Google获取，设置一个纯色背景和文字作为替代
            logo.style.display = 'flex';
            logo.style.justifyContent = 'center';
            logo.style.alignItems = 'center';
            logo.style.backgroundColor = getRandomColor(tag.name);
            logo.style.color = '#ffffff';
            logo.style.fontSize = '20px';
            logo.style.fontWeight = 'bold';
            logo.style.textAlign = 'center';
            // 使用网站名称的第一个字符作为图标
            logo.textContent = tag.name.charAt(0).toUpperCase();
            // 防止重复触发onerror事件
            logo.onerror = null;
        };
    } catch (e) {
        // 如果URL解析失败，默认使用文字作为图标
        logo.style.display = 'flex';
        logo.style.justifyContent = 'center';
        logo.style.alignItems = 'center';
        logo.style.backgroundColor = getRandomColor(tag.name);
        logo.style.color = '#ffffff';
        logo.style.fontSize = '20px';
        logo.style.fontWeight = 'bold';
        logo.style.textAlign = 'center';
        logo.textContent = tag.name.charAt(0).toUpperCase();
    }
    
    card.appendChild(logo);
    
    // 信息容器
    const infoContainer = document.createElement('div');
    infoContainer.className = 'info-container';
    infoContainer.innerHTML = `
        <div class="tag-name">${tag.name}</div>
        <div class="tag-url">${tag.note ? tag.note : (tag.url.length > 30 ? tag.url.substring(0, 30) + '...' : tag.url)}</div>
    `;
    card.appendChild(infoContainer);
    
    // 只在非默认类目下添加操作按钮
    const currentCat = categories[currentCategory];
    if (!currentCat.isDefault) {
        // 操作按钮
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        
        const editButton = document.createElement('button');
        editButton.className = 'edit-button';
        const editIcon = document.createElement('i');
        editIcon.className = 'ri-edit-line';
        editButton.appendChild(editIcon);
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'ri-delete-bin-line';
        deleteButton.appendChild(deleteIcon);
        
        if (tagIndex !== undefined) {
            // 普通类目下的标签
            editButton.dataset.index = tagIndex;
            editButton.onclick = (e) => {
                e.stopPropagation();
                editTag(tagIndex);
            };
            
            deleteButton.dataset.index = tagIndex;
            deleteButton.onclick = (e) => {
                e.stopPropagation();
                deleteTag(tagIndex);
            };
        }
        
        actionButtons.appendChild(editButton);
        actionButtons.appendChild(deleteButton);
        card.appendChild(actionButtons);
    }
    
    // 绑定卡片点击事件
    card.onclick = () => {
        window.open(tag.url, '_blank');
    };
    
    return card;
}