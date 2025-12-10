// ========== Supabase 配置 ==========
const SUPABASE_URL = 'https://qiyopgsspzsgutnhwbfs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeW9wZ3NzcHpzZ3V0bmh3YmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNDYxNDgsImV4cCI6MjA4MDkyMjE0OH0.mJw3eVQpjEZRrcsUM1zoPVxp_i7k4E-KpUSJjiYGS_E';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let isAuthMode = 'login'; // 'login' 或 'signup'

// ========== 认证相关函数 ==========

// 检查登录状态
async function checkAuthStatus() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = session.user;
            showUserProfile();
            await loadDataFromSupabase();
        } else {
            currentUser = null;
            showLoginPrompt();
        }
        showMainUI();
    } catch (error) {
        console.error('检查登录状态失败:', error);
        showMainUI();
    }
}

// 显示全屏登录界面
function showFullScreenAuthUI() {
    // 隐藏主要内容
    document.querySelector('.app-container').style.display = 'none';
    document.querySelector('.mode-toggle').style.display = 'none';
    
    // 创建全屏登录背景
    let authScreen = document.getElementById('fullscreenAuthScreen');
    if (!authScreen) {
        authScreen = document.createElement('div');
        authScreen.id = 'fullscreenAuthScreen';
        authScreen.className = 'fullscreen-auth-screen';
        document.body.insertBefore(authScreen, document.body.firstChild);
    }
    
    authScreen.style.display = 'flex';
    showAuthModal();
}

// 显示登录提示（在左下角）
function showLoginPrompt() {
    const sidebarControls = document.querySelector('.sidebar-controls');
    if (!sidebarControls) return;
    
    // 检查是否已经存在登录区域
    let loginSection = document.getElementById('loginPromptSection');
    if (!loginSection) {
        loginSection = document.createElement('div');
        loginSection.id = 'loginPromptSection';
        loginSection.className = 'login-prompt-section';
        sidebarControls.insertAdjacentElement('afterend', loginSection);
    }
    
    loginSection.innerHTML = `
        <div class="login-prompt-content">
            <p>未登录</p>
            <button class="login-prompt-btn" onclick="showAuthModal()">登录/注册</button>
        </div>
    `;
    loginSection.style.display = 'flex';
}

// 显示用户信息区域（在左下角）
function showUserInfoPrompt() {
    const sidebarControls = document.querySelector('.sidebar-controls');
    if (!sidebarControls || !currentUser) return;
    
    // 检查是否已经存在登录区域
    let loginSection = document.getElementById('loginPromptSection');
    if (!loginSection) {
        loginSection = document.createElement('div');
        loginSection.id = 'loginPromptSection';
        loginSection.className = 'login-prompt-section';
        sidebarControls.insertAdjacentElement('afterend', loginSection);
    }
    
    const email = currentUser.email || 'User';
    const firstChar = email.charAt(0).toUpperCase();
    
    loginSection.innerHTML = `
        <div class="user-info-content">
            <div class="user-info-header" onclick="toggleUserMenuBottom()">
                <div class="user-avatar-small">${firstChar}</div>
                <div class="user-info-text">
                    <div class="user-email-short">${email.split('@')[0]}</div>
                    <div class="user-status">已登录</div>
                </div>
            </div>
            <div class="user-menu-bottom" id="userMenuBottom">
                <button class="logout-btn-bottom" onclick="logoutUser()">退出登录</button>
            </div>
        </div>
    `;
    loginSection.style.display = 'flex';
}

// 切换底部用户菜单
function toggleUserMenuBottom() {
    const userMenuBottom = document.getElementById('userMenuBottom');
    if (userMenuBottom) {
        userMenuBottom.classList.toggle('show');
    }
}

// 显示主应用界面
function showMainUI() {
    document.querySelector('.app-container').style.display = 'flex';
    document.querySelector('.mode-toggle').style.display = 'flex';
    
    const authScreen = document.getElementById('fullscreenAuthScreen');
    if (authScreen) {
        authScreen.style.display = 'none';
    }
    
    closeModal();
    renderCategories();
}

// 显示用户信息
function showUserProfile() {
    if (!currentUser) {
        showLoginPrompt();
        return;
    }
    
    const userMenuBtn = document.getElementById('userMenuBtn');
    userMenuBtn.style.display = 'block';
    
    const userAvatar = document.getElementById('userAvatar');
    const email = currentUser.email || 'User';
    const firstChar = email.charAt(0).toUpperCase();
    userAvatar.textContent = firstChar;
    userAvatar.title = email;
    
    const userInfo = document.getElementById('userInfo');
    userInfo.innerHTML = `
        <div class="user-avatar-display" style="margin-bottom: 8px;">
            <div class="user-avatar-large">${firstChar}</div>
        </div>
        <div class="user-email" style="word-break: break-all;">${email}</div>
    `;
    
    // 同时在左下角显示用户信息
    showUserInfoPrompt();
}

// 切换用户菜单
function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    userMenu.classList.toggle('show');
}

// 登出用户
async function logoutUser() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        categories = [{ name: "全部", tags: [], isDefault: true }];
        localStorage.removeItem('categories');
        isAuthMode = 'login';
        document.getElementById('userMenu').classList.remove('show');
        // 关闭底部用户菜单
        const userMenuBottom = document.getElementById('userMenuBottom');
        if (userMenuBottom) {
            userMenuBottom.classList.remove('show');
        }
        // 显示登录提示
        showLoginPrompt();
        alert('已退出登录');
    } catch (error) {
        console.error('登出失败:', error);
        alert('登出失败: ' + error.message);
    }
}

// 切换登录/注册模式
function toggleAuthMode(event) {
    event.preventDefault();
    isAuthMode = isAuthMode === 'login' ? 'signup' : 'login';
    const authModalTitle = document.getElementById('authModalTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authToggleText = document.getElementById('authToggleText');
    
    if (isAuthMode === 'signup') {
        authModalTitle.textContent = '注册';
        authSubmitBtn.textContent = '注册';
        authToggleText.innerHTML = '已有账号？<a href="#" onclick="toggleAuthMode(event)">立即登录</a>';
    } else {
        authModalTitle.textContent = '登录';
        authSubmitBtn.textContent = '登录';
        authToggleText.innerHTML = '还没有账号？<a href="#" onclick="toggleAuthMode(event)">立即注册</a>';
    }
}

// 验证邮箱格式
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 处理认证提交
async function handleAuthSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const authMessage = document.getElementById('authMessage');
    
    if (!email || !password) {
        authMessage.textContent = '请填写邮箱和密码';
        authMessage.className = 'auth-message error';
        return;
    }
    
    if (!isValidEmail(email)) {
        authMessage.textContent = '请输入有效的邮箱地址（如：user@gmail.com）';
        authMessage.className = 'auth-message error';
        return;
    }
    
    if (password.length < 6) {
        authMessage.textContent = '密码至少6位';
        authMessage.className = 'auth-message error';
        return;
    }
    
    try {
        authMessage.textContent = '处理中...';
        authMessage.className = 'auth-message loading';
        
        if (isAuthMode === 'signup') {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            
            if (error) {
                // 处理特定的错误信息
                let errorText = error.message;
                if (errorText.includes('invalid')) {
                    errorText = '邮箱格式无效。请使用真实邮箱（如：user@gmail.com）';
                } else if (errorText.includes('already exists')) {
                    errorText = '该邮箱已被注册';
                } else if (errorText.includes('password')) {
                    errorText = '密码不符合要求（需要至少6个字符）';
                }
                authMessage.textContent = errorText;
                authMessage.className = 'auth-message error';
            } else {
                authMessage.textContent = '注册成功！请检查邮箱验证（如未收到，请查看垃圾邮件）。现在可以直接登录。';
                authMessage.className = 'auth-message success';
                document.getElementById('authForm').reset();
                isAuthMode = 'login';
                document.getElementById('authModalTitle').textContent = '登录';
                document.getElementById('authSubmitBtn').textContent = '登录';
            }
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                let errorText = error.message;
                if (errorText.includes('Invalid')) {
                    errorText = '邮箱或密码错误';
                } else if (errorText.includes('Email not confirmed')) {
                    errorText = '邮箱未验证，请检查邮箱中的验证链接';
                }
                authMessage.textContent = errorText;
                authMessage.className = 'auth-message error';
            } else {
                currentUser = data.session.user;
                authMessage.textContent = '登录成功！正在跳转...';
                authMessage.className = 'auth-message success';
                
                setTimeout(async () => {
                    document.getElementById('authForm').reset();
                    authMessage.textContent = '';
                    showUserProfile();
                    await loadDataFromSupabase();
                    closeModal();
                }, 1000);
            }
        }
    } catch (error) {
        authMessage.textContent = '操作失败: ' + error.message;
        authMessage.className = 'auth-message error';
    }
}

// ========== 数据库操作函数 ==========

// 从 Supabase 加载数据
async function loadDataFromSupabase() {
    if (!currentUser) {
        loadLocalData();
        return;
    }
    
    try {
        const { data: categoriesData, error } = await supabase
            .from('categories')
            .select(`
                id,
                name,
                is_default,
                sort_order,
                tags (
                    id,
                    name,
                    url,
                    note,
                    sort_order
                )
            `)
            .eq('user_id', currentUser.id)
            .order('sort_order');
        
        if (error) {
            console.error('加载数据失败:', error);
            loadLocalData();
            return;
        }
        
        if (!categoriesData || categoriesData.length === 0) {
            // 首次使用，创建默认类目
            await createDefaultCategory();
            // 再加载一次数据
            await loadDataFromSupabase();
            return;
        } else {
            // 转换数据格式
            categories = categoriesData.map(cat => ({
                id: cat.id,
                name: cat.name,
                isDefault: cat.is_default,
                sortOrder: cat.sort_order,
                tags: (cat.tags || []).map(tag => ({
                    id: tag.id,
                    name: tag.name,
                    url: tag.url,
                    note: tag.note,
                    sortOrder: tag.sort_order
                }))
            }));
            
            // 保存到本地缓存
            localStorage.setItem('categories', JSON.stringify(categories));
        }
        
        renderCategories();
    } catch (error) {
        console.error('从 Supabase 加载数据异常:', error);
        loadLocalData();
    }
}

// 加载本地数据
function loadLocalData() {
    categories = JSON.parse(localStorage.getItem('categories') || '[]');
    if (!Array.isArray(categories)) {
        categories = [];
    }
    
    let hasDefaultGroup = false;
    for (let i = 0; i < categories.length; i++) {
        if (categories[i].isDefault) {
            hasDefaultGroup = true;
            break;
        }
    }
    
    if (!hasDefaultGroup) {
        categories.unshift({ name: "全部", tags: [], isDefault: true });
        localStorage.setItem('categories', JSON.stringify(categories));
    }
    
    renderCategories();
}
async function migrateLocalDataToCloud() {
    if (!currentUser) return;
    
    const localData = JSON.parse(localStorage.getItem('categories') || '[]');
    if (localData.length === 0) {
        // 创建默认类目
        await createDefaultCategory();
        return;
    }
    
    try {
        for (const localCat of localData) {
            if (localCat.isDefault) continue;
            
            // 创建类目
            const { data: catData, error: catError } = await supabase
                .from('categories')
                .insert({
                    user_id: currentUser.id,
                    name: localCat.name,
                    is_default: false
                })
                .select()
                .single();
            
            if (catError) {
                console.error('创建类目失败:', catError);
                continue;
            }
            
            // 创建标签
            if (localCat.tags && localCat.tags.length > 0) {
                const tagsToInsert = localCat.tags.map((tag, index) => ({
                    category_id: catData.id,
                    name: tag.name,
                    url: tag.url,
                    note: tag.note || '',
                    sort_order: index
                }));
                
                const { error: tagsError } = await supabase
                    .from('tags')
                    .insert(tagsToInsert);
                
                if (tagsError) {
                    console.error('创建标签失败:', tagsError);
                }
            }
        }
        
        // 创建默认类目
        await createDefaultCategory();
        
        // 重新加载数据
        await loadDataFromSupabase();
        alert('已将本地书签同步到云端！');
    } catch (error) {
        console.error('迁移数据失败:', error);
    }
}

// 创建默认类目
async function createDefaultCategory() {
    if (!currentUser) return;
    
    const { error } = await supabase
        .from('categories')
        .insert({
            user_id: currentUser.id,
            name: '全部',
            is_default: true,
            sort_order: 0
        });
    
    if (error) {
        console.error('创建默认类目失败:', error);
    }
}

// 保存类目到 Supabase
async function saveCategoryToSupabase(categoryName) {
    if (!currentUser) return null;
    
    try {
        const { data, error } = await supabase
            .from('categories')
            .insert({
                user_id: currentUser.id,
                name: categoryName,
                is_default: false,
                sort_order: categories.length
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('保存类目失败:', error);
        return null;
    }
}

// 保存标签到 Supabase
async function saveTagToSupabase(categoryId, tagName, tagUrl, tagNote) {
    if (!currentUser) return null;
    
    try {
        // 获取该类目下的标签数数
        const category = categories.find(c => c.id === categoryId);
        const sortOrder = category ? category.tags.length : 0;
        
        const { data, error } = await supabase
            .from('tags')
            .insert({
                category_id: categoryId,
                name: tagName,
                url: tagUrl,
                note: tagNote || '',
                sort_order: sortOrder
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('保存标签失败:', error);
        return null;
    }
}

// 删除类目从 Supabase
async function deleteCategoryFromSupabase(categoryId) {
    if (!currentUser) return false;
    
    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('删除类目失败:', error);
        return false;
    }
}

// 删除标签从 Supabase
async function deleteTagFromSupabase(tagId) {
    if (!currentUser) return false;
    
    try {
        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', tagId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('删除标签失败:', error);
        return false;
    }
}

// 更新类目名称在 Supabase
async function updateCategoryNameInSupabase(categoryId, newName) {
    if (!currentUser) return false;
    
    try {
        const { error } = await supabase
            .from('categories')
            .update({ name: newName })
            .eq('id', categoryId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('更新类目失败:', error);
        return false;
    }
}

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

let categories = [];
let currentCategory = null;
let editingTag = null;
let editingCategory = null;

// 初始化时加载数据或检查登录状态

// 渲染类目导航
function renderCategories() {
    const categoryNav = document.getElementById('categoryNav');
    categoryNav.innerHTML = '';
        
    // 生成侧边栏导航链接
    categories.forEach((category, index) => {
        if (index === 0 && category.isDefault) return; // 不为"全部"类目创建导航项
        
        // 创建锚点链接
        const a = document.createElement('a');
        a.href = `#category-${index}`;
        a.textContent = category.name;
        a.dataset.index = index;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            // 移除所有active类
            document.querySelectorAll('.category-sidebar a').forEach(el => el.classList.remove('active'));
            // 添加active类到当前点击的元素
            a.classList.add('active');
            // 滚动到目标位置，但只滚动主内容区域，不影响侧栏
            const targetElement = document.getElementById(`category-${index}`);
            if (targetElement) {
                const mainContent = document.querySelector('.main-content');
                const topPosition = targetElement.offsetTop - 20; // 添加一点偏移，防止太贴近顶部
                mainContent.scrollTo({
                    top: topPosition,
                    behavior: 'smooth'
                });
            }
        });
        
        categoryNav.appendChild(a);
    });
            
    // 渲染所有标签
    renderAllCategories();
    
    // 默认激活第一个导航项
    const firstNav = categoryNav.querySelector('a');
    if (firstNav) {
        firstNav.classList.add('active');
        // 滚动到第一个类目
        setTimeout(() => {
            const firstCategory = document.getElementById(`category-${firstNav.dataset.index}`);
            if (firstCategory) {
                const mainContent = document.querySelector('.main-content');
                const topPosition = firstCategory.offsetTop - 20; // 添加一点偏移，防止太贴近顶部
                mainContent.scrollTo({
                    top: topPosition,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }
}

function openCategoryModal() {
    if (!currentUser) {
        alert('请先登录以创建分组');
        showAuthModal();
        return;
    }
    document.getElementById('categoryModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    // 获取焦点
    setTimeout(() => {
        document.getElementById('categoryInput').focus();
    }, 100);
}

function openTagModal() {
    if (!currentUser) {
        alert('请先登录以添加标签');
        showAuthModal();
        return;
    }
    // 清空输入框内容，仅在添加新标签时(非编辑模式)
    if (editingTag === null) {
        document.getElementById('tagNameInput').value = '';
        document.getElementById('tagUrlInput').value = '';
        document.getElementById('tagNoteInput').value = '';
        document.getElementById('tagModal').querySelector('h3').textContent = '添加标签';
    }
    document.getElementById('tagModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    // 获取焦点
    setTimeout(() => {
        document.getElementById('tagNameInput').focus();
    }, 100);
}

function closeModal() {
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('tagModal').classList.remove('active');
    document.getElementById('duplicateModal').classList.remove('active');
    document.getElementById('renameModal').classList.remove('active');
    document.getElementById('deleteModal').classList.remove('active');
    document.getElementById('deleteTagModal').classList.remove('active');
    document.getElementById('authModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('userMenu').classList.remove('show');
    // 重置表单和编辑状态
    document.getElementById('categoryInput').value = '';
    document.getElementById('authForm').reset();
    document.getElementById('authMessage').textContent = '';
    editingTag = null;
}

function saveCategory() {
    const categoryName = document.getElementById('categoryInput').value;
    if (categoryName) {
        // 如果用户未登录，只保存到本地
        if (!currentUser) {
            const newCategory = { name: categoryName, tags: [], isDefault: false };
            categories.push(newCategory);
            localStorage.setItem('categories', JSON.stringify(categories));
            renderCategories();
            closeModal();
            return;
        }
        
        // 登录状态下，保存到 Supabase
        saveCategoryToSupabase(categoryName).then(data => {
            if (data) {
                const newCategory = {
                    id: data.id,
                    name: data.name,
                    isDefault: data.is_default,
                    tags: []
                };
                categories.push(newCategory);
                localStorage.setItem('categories', JSON.stringify(categories));
                renderCategories();
                closeModal();
            } else {
                alert('保存失败，请重试');
            }
        });
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
        // 编辑现有标签
        const categoryIndex = editingCategory;
        const tagIndex = editingTag;
        categories[categoryIndex].tags[tagIndex] = { name: tagName, url: tagUrl, note: tagNote };
    } else {
        // 添加新标签
        const categoryIndex = editingCategory;
        categories[categoryIndex].tags.push({ name: tagName, url: tagUrl, note: tagNote });
    }
    
    // 如果登录了，保存到 Supabase
    if (currentUser && categories[editingCategory].id) {
        if (editingTag !== null) {
            const tag = categories[editingCategory].tags[editingTag];
            if (tag.id) {
                supabase
                    .from('tags')
                    .update({
                        name: tagName,
                        url: tagUrl,
                        note: tagNote || ''
                    })
                    .eq('id', tag.id)
                    .then(({ error }) => {
                        if (error) console.error('更新标签失败:', error);
                    });
            }
        } else {
            saveTagToSupabase(categories[editingCategory].id, tagName, tagUrl, tagNote).then(data => {
                if (data) {
                    categories[editingCategory].tags[categories[editingCategory].tags.length - 1].id = data.id;
                }
            });
        }
    }
    
    localStorage.setItem('categories', JSON.stringify(categories));
    renderAllCategories();
    closeModal();
    
    document.getElementById('tagNameInput').value = '';
    document.getElementById('tagUrlInput').value = '';
    document.getElementById('tagNoteInput').value = '';
}

function editTag(categoryIndex, tagIndex) {
    editingCategory = categoryIndex;
    editingTag = tagIndex;
    const tag = categories[categoryIndex].tags[tagIndex];
    document.getElementById('tagNameInput').value = tag.name;
    document.getElementById('tagUrlInput').value = tag.url;
    document.getElementById('tagNoteInput').value = tag.note || '';
    document.getElementById('tagModal').querySelector('h3').textContent = '编辑标签';
    openTagModal();
}

function deleteTag(categoryIndex, tagIndex) {
    editingCategory = categoryIndex;
    editingTag = tagIndex;
    document.getElementById('deleteTagModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function confirmDeleteTag() {
    const categoryIndex = editingCategory;
    const tagIndex = editingTag;
    const tag = categories[categoryIndex].tags[tagIndex];
    
    // 如果登录了，从 Supabase 删除
    if (currentUser && tag.id) {
        deleteTagFromSupabase(tag.id);
    }
    
    categories[categoryIndex].tags.splice(tagIndex, 1);
    localStorage.setItem('categories', JSON.stringify(categories));
    renderAllCategories();
    closeModal();
    editingTag = null;
    editingCategory = null;
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

// 渲染所有类目的标签
function renderAllCategories() {
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.innerHTML = '';
    
    // 检查是否有类目
    if (categories.length <= 1 && categories[0].isDefault) {
        cardContainer.innerHTML = '<div class="empty-state">暂无类目，请先添加类目</div>';
                return;
            }
            
    // 渲染每个类目区域
    categories.forEach((category, categoryIndex) => {
        if (categoryIndex === 0 && category.isDefault) return; // 跳过"全部"类目
        
        // 创建类目区域
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        categorySection.id = `category-${categoryIndex}`; // 用于锚点定位
        
        // 创建类目标题
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        
        // 标题文本
        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.name;
        categoryHeader.appendChild(categoryTitle);
        
        // 类目操作按钮
        const categoryActions = document.createElement('div');
        categoryActions.className = 'category-actions';
        categoryActions.dataset.categoryIndex = categoryIndex;
        
        // 添加按钮
        const addButton = document.createElement('button');
        addButton.innerHTML = '<i class="ri-add-line"></i>';
        addButton.title = '添加标签';
        addButton.onclick = () => addTagToCategory(categoryIndex);
        
        // 重命名按钮
        const renameButton = document.createElement('button');
        renameButton.innerHTML = '<i class="ri-edit-line"></i>';
        renameButton.title = '重命名类目';
        renameButton.onclick = renameCategory;
        
        // 删除按钮
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="ri-delete-bin-line"></i>';
        deleteButton.title = '删除类目';
        deleteButton.onclick = deleteCategory;
        
        categoryActions.appendChild(addButton);
        categoryActions.appendChild(renameButton);
        categoryActions.appendChild(deleteButton);
        categoryHeader.appendChild(categoryActions);
        
        categorySection.appendChild(categoryHeader);
        
        // 创建卡片容器
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'cards-grid';
        
        // 渲染该类目下的标签
        if (category.tags.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = '暂无标签，点击右上角 + 按钮添加';
            cardsGrid.appendChild(emptyState);
        } else {
            category.tags.forEach((tag, tagIndex) => {
                const card = createTagCard(tag, categoryIndex, tagIndex);
                cardsGrid.appendChild(card);
            });
        }
        
        categorySection.appendChild(cardsGrid);
        cardContainer.appendChild(categorySection);
    });
}
                
// 创建标签卡片
function createTagCard(tag, categoryIndex, tagIndex) {
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
                        <div class="tag-url">${tag.note ? tag.note : tag.url}</div>
                    `;
                    card.appendChild(infoContainer);
    
    // 创建操作按钮
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    
    // 编辑按钮
    const editButton = document.createElement('button');
    editButton.innerHTML = '<i class="ri-edit-line"></i>';
    editButton.onclick = (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        editTag(categoryIndex, tagIndex);
    };
    actionButtons.appendChild(editButton);
    
    // 删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="ri-delete-bin-line"></i>';
    deleteButton.onclick = (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        deleteTag(categoryIndex, tagIndex);
    };
    actionButtons.appendChild(deleteButton);
    
    card.appendChild(actionButtons);
                    
    // 绑定卡片点击事件
    card.onclick = () => {
        window.open(tag.url, '_blank');
    };
    
    return card;
}

// 添加类目的标签创建按钮事件
function addTagToCategory(categoryIndex) {
    editingCategory = categoryIndex;
    editingTag = null;
    document.getElementById('tagNameInput').value = '';
    document.getElementById('tagUrlInput').value = '';
    document.getElementById('tagNoteInput').value = '';
    document.getElementById('tagModal').querySelector('h3').textContent = '添加标签';
    openTagModal();
}

function renameCategory() {
    // 获取当前点击的类目索引
    editingCategory = parseInt(event.currentTarget.closest('.category-actions').dataset.categoryIndex);
    if (editingCategory !== null) {
        document.getElementById('renameInput').value = categories[editingCategory].name;
        document.getElementById('renameModal').classList.add('active');
        document.getElementById('overlay').classList.add('active');
        // 获取焦点
        setTimeout(() => {
            document.getElementById('renameInput').focus();
        }, 100);
    }
}

function saveRenameCategory() {
    const newName = document.getElementById('renameInput').value.trim();
    if (newName && editingCategory !== null) {
        // 检查是否有重名
        const isDuplicate = categories.some((cat, index) => 
            index !== editingCategory && cat.name === newName
        );
        
        if (isDuplicate) {
            alert('已存在同名类目');
            return;
        }
        
        const categoryId = categories[editingCategory].id;
        
        // 如果登录了，更新 Supabase
        if (currentUser && categoryId) {
            updateCategoryNameInSupabase(categoryId, newName);
        }
    
        categories[editingCategory].name = newName;
        localStorage.setItem('categories', JSON.stringify(categories));
        renderCategories();
        closeModal();
    }
}

function deleteCategory() {
    // 获取当前点击的类目索引
    editingCategory = parseInt(event.currentTarget.closest('.category-actions').dataset.categoryIndex);
    if (editingCategory !== null) {
        document.getElementById('deleteModal').classList.add('active');
        document.getElementById('overlay').classList.add('active');
    }
}

function confirmDeleteCategory() {
    if (editingCategory !== null) {
        // 不能删除默认类目
        if (categories[editingCategory].isDefault) {
            alert('默认类目不能删除');
            closeModal();
            return;
        }
        
        const categoryId = categories[editingCategory].id;
        
        // 如果登录了，从 Supabase 删除
        if (currentUser && categoryId) {
            deleteCategoryFromSupabase(categoryId);
        }
        
        categories.splice(editingCategory, 1);
        localStorage.setItem('categories', JSON.stringify(categories));
        
        renderCategories();
        closeModal();
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态
    checkAuthStatus();
    
    // 添加主内容区域滚动监听器
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('scroll', updateActiveNavOnScroll);
    }
    
    // 深色模式检测和设置
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-icon').style.display = 'block';
        document.getElementById('light-mode-icon').style.display = 'none';
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('light-mode-icon').style.display = 'block';
        document.getElementById('dark-mode-icon').style.display = 'none';
    }

    // 添加ESC键监听器关闭弹窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // 添加点击遮罩层关闭弹窗
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    // 点击页面其他地方关闭用户菜单
    document.addEventListener('click', function(e) {
        const userMenu = document.getElementById('userMenu');
        const userMenuBtn = document.getElementById('userMenuBtn');
        if (userMenu && userMenuBtn && !userMenu.contains(e.target) && !userMenuBtn.contains(e.target)) {
            userMenu.classList.remove('show');
        }
    });
});

// 显示认证弹窗
function showAuthModal() {
    if (currentUser) {
        alert('已登录');
        return;
    }
    
    document.getElementById('authModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
    document.getElementById('authEmail').focus();
}

// 滚动时更新活跃导航项
function updateActiveNavOnScroll() {
    // 获取所有类目区域
    const categorySections = document.querySelectorAll('.category-section');
    if (categorySections.length === 0) return;
    
    const mainContent = document.querySelector('.main-content');
    const scrollPosition = mainContent.scrollTop + 100; // 添加一些偏移，使导航更早激活
    
    // 找到当前滚动位置对应的类目
    let currentSection = categorySections[0];
    
    for (const section of categorySections) {
        // 检查当前滚动位置是否在此区域上方
        if (section.offsetTop <= scrollPosition) {
            currentSection = section;
        } else {
            break; // 如果已经超过当前滚动位置，退出循环
        }
    }
    
    // 获取当前类目对应的索引
    const currentIndex = currentSection.id.split('-')[1];
    
    // 更新侧栏导航激活状态
    const navLinks = document.querySelectorAll('.category-sidebar a');
    navLinks.forEach(link => {
        if (link.dataset.index === currentIndex) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}