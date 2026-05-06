/* ════════════════════════════════════════
   PostFlow — Application Logic
   ════════════════════════════════════════ */

const API_BASE = 'https://python-api-development-2.onrender.com';

// ─── State ───
let state = {
    token: localStorage.getItem('pf_token') || null,
    user: JSON.parse(localStorage.getItem('pf_user') || 'null'),
    posts: [],
    currentPage: 0,
    pageSize: 10,
    searchQuery: '',
    filterMyPosts: false,
    loading: false,
    hasMore: true,
};

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    updateAuthUI();
    fetchPosts();
    setupScrollListener();
    setupSearchDebounce();
    setupTitleCharCount();
    setupClickOutside();
}

// ════════════════════════════════
// AUTH
// ════════════════════════════════

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('login-submit');
    const errorEl = document.getElementById('login-error');

    errorEl.classList.add('hidden');
    setButtonLoading(submitBtn, true);

    try {
        // Login endpoint expects form-urlencoded
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Invalid credentials');
        }

        const data = await res.json();
        state.token = data.access_token;
        localStorage.setItem('pf_token', data.access_token);

        // Decode token to get user_id
        const payload = parseJwt(data.access_token);
        if (payload && payload.user_id) {
            // Fetch user info
            try {
                const userRes = await fetch(`${API_BASE}/users/${payload.user_id}`);
                if (userRes.ok) {
                    state.user = await userRes.json();
                    localStorage.setItem('pf_user', JSON.stringify(state.user));
                }
            } catch (_) {
                state.user = { id: payload.user_id, email: email };
                localStorage.setItem('pf_user', JSON.stringify(state.user));
            }
        }

        updateAuthUI();
        hideAllModals();
        showToast('Welcome back! 🎉', 'success');
        // Re-fetch posts since we're now logged in
        resetAndFetchPosts();
    } catch (err) {
        showFormError(errorEl, err.message);
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const submitBtn = document.getElementById('register-submit');
    const errorEl = document.getElementById('register-error');

    errorEl.classList.add('hidden');

    if (password !== confirm) {
        showFormError(errorEl, 'Passwords do not match');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const res = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const err = await res.json();
            const detail = err.detail;
            if (typeof detail === 'string') throw new Error(detail);
            if (Array.isArray(detail)) throw new Error(detail.map(d => d.msg).join(', '));
            throw new Error('Registration failed');
        }

        showToast('Account created! Please log in.', 'success');
        switchModal('login');
        document.getElementById('login-email').value = email;
    } catch (err) {
        showFormError(errorEl, err.message);
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

function logout() {
    state.token = null;
    state.user = null;
    state.filterMyPosts = false;
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    updateAuthUI();
    closeUserDropdown();
    showToast('Signed out successfully', 'info');
    resetAndFetchPosts();
}

function updateAuthUI() {
    const authBtns = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const mobileAuth = document.getElementById('mobile-auth-buttons');
    const mobileUser = document.getElementById('mobile-user-menu');
    const heroCTA = document.getElementById('hero-cta-btn');

    if (state.token && state.user) {
        authBtns.classList.add('hidden');
        userMenu.classList.remove('hidden');
        mobileAuth.classList.add('hidden');
        mobileUser.classList.remove('hidden');

        const initial = (state.user.email || 'U').charAt(0).toUpperCase();
        document.getElementById('user-avatar').textContent = initial;
        document.getElementById('dropdown-email').textContent = state.user.email;
        document.getElementById('mobile-user-email').textContent = state.user.email;
        heroCTA.textContent = 'Create a Post';
    } else {
        authBtns.classList.remove('hidden');
        userMenu.classList.add('hidden');
        mobileAuth.classList.remove('hidden');
        mobileUser.classList.add('hidden');
        heroCTA.textContent = 'Get Started';
    }
}

function handleHeroCTA() {
    if (state.token) {
        showModal('create-post');
    } else {
        showModal('register');
    }
}

// ════════════════════════════════
// POSTS — CRUD
// ════════════════════════════════

async function fetchPosts(append = false) {
    if (state.loading) return;
    state.loading = true;

    const skeleton = document.getElementById('posts-skeleton');
    const grid = document.getElementById('posts-grid');
    const empty = document.getElementById('empty-state');
    const loadMore = document.getElementById('load-more');

    if (!append) {
        skeleton.classList.remove('hidden');
        grid.classList.add('hidden');
        empty.classList.add('hidden');
        loadMore.classList.add('hidden');
    }

    try {
        const params = new URLSearchParams({
            limit: state.pageSize,
            skip: append ? state.posts.length : 0,
        });
        if (state.searchQuery) params.append('search', state.searchQuery);

        const headers = {};
        if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

        const res = await fetch(`${API_BASE}/posts?${params}`, { headers });

        if (!res.ok) {
            if (res.status === 401) {
                // Token may be expired
                logout();
                showToast('Session expired. Please log in again.', 'error');
                return;
            }
            throw new Error('Failed to load posts');
        }

        const data = await res.json();

        if (append) {
            state.posts = [...state.posts, ...data];
        } else {
            state.posts = data;
        }

        state.hasMore = data.length === state.pageSize;

        renderPosts();
        updateStats();
    } catch (err) {
        console.error(err);
        if (!append) {
            showToast('Could not load posts. The server may be starting up — try again in a moment.', 'error');
        }
    } finally {
        state.loading = false;
        skeleton.classList.add('hidden');
    }
}

function renderPosts() {
    const grid = document.getElementById('posts-grid');
    const empty = document.getElementById('empty-state');
    const loadMore = document.getElementById('load-more');

    let postsToRender = state.posts;

    // Filter for "My Posts"
    if (state.filterMyPosts && state.user) {
        postsToRender = postsToRender.filter(p => p.Post.owner_id === state.user.id);
    }

    if (postsToRender.length === 0) {
        grid.classList.add('hidden');
        empty.classList.remove('hidden');
        loadMore.classList.add('hidden');
        if (state.filterMyPosts) {
            document.getElementById('empty-state-msg').textContent = "You haven't created any posts yet.";
        } else if (state.searchQuery) {
            document.getElementById('empty-state-msg').textContent = `No posts found for "${state.searchQuery}".`;
        } else {
            document.getElementById('empty-state-msg').textContent = 'Be the first to share something!';
        }
        return;
    }

    empty.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = postsToRender.map(postData => createPostCard(postData)).join('');
    loadMore.classList.toggle('hidden', !state.hasMore || state.filterMyPosts);
}

function createPostCard(postData) {
    const post = postData.Post;
    const votes = postData.votes;
    const isOwner = state.user && post.owner_id === state.user.id;
    const ownerEmail = post.owner ? post.owner.email : 'Anonymous';
    const initial = ownerEmail.charAt(0).toUpperCase();
    const date = formatDate(post.created_at);
    const truncatedContent = post.content.length > 200 
        ? post.content.substring(0, 200) + '…' 
        : post.content;

    return `
        <article class="post-card" onclick="openPostDetail(${post.id})" id="post-card-${post.id}">
            <div class="post-card-header">
                <div class="post-author-avatar">${initial}</div>
                <div class="post-author-info">
                    <div class="post-author-email">${escapeHtml(ownerEmail)}</div>
                    <div class="post-date">${date}</div>
                </div>
                ${!post.published ? '<span class="post-status draft">Draft</span>' : ''}
            </div>
            <div class="post-card-body">
                <h3 class="post-card-title">${escapeHtml(post.title)}</h3>
                <p class="post-card-content">${escapeHtml(truncatedContent)}</p>
            </div>
            <div class="post-card-footer">
                <button class="post-vote-btn ${votes > 0 ? '' : ''}" onclick="event.stopPropagation(); toggleVote(${post.id}, true)" title="Upvote">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                    ${votes}
                </button>
                ${isOwner ? `
                    <div class="post-actions">
                        <button class="post-action-btn" onclick="event.stopPropagation(); editPost(${post.id})" title="Edit">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="post-action-btn delete" onclick="event.stopPropagation(); deletePost(${post.id})" title="Delete">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        </article>
    `;
}

function openPostDetail(id) {
    const postData = state.posts.find(p => p.Post.id === id);
    if (!postData) return;

    const post = postData.Post;
    const votes = postData.votes;
    const ownerEmail = post.owner ? post.owner.email : 'Anonymous';
    const initial = ownerEmail.charAt(0).toUpperCase();
    const date = formatDate(post.created_at);
    const isOwner = state.user && post.owner_id === state.user.id;

    const detailHTML = `
        <div class="post-detail">
            <div class="post-detail-header">
                <div class="post-detail-avatar">${initial}</div>
                <div class="post-detail-meta">
                    <div class="post-detail-email">${escapeHtml(ownerEmail)}</div>
                    <div class="post-detail-date">${date}</div>
                </div>
                ${!post.published ? '<span class="post-status draft">Draft</span>' : '<span class="post-status published">Published</span>'}
            </div>
            <h2>${escapeHtml(post.title)}</h2>
            <div class="post-detail-body">${escapeHtml(post.content)}</div>
            <div class="post-detail-actions">
                <button class="post-vote-btn" onclick="toggleVote(${post.id}, true)" title="Upvote">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                    ${votes} vote${votes !== 1 ? 's' : ''}
                </button>
                ${isOwner ? `
                    <button class="btn btn-ghost btn-sm" onclick="hideAllModals(); editPost(${post.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                    </button>
                    <button class="btn btn-ghost btn-sm danger-text" onclick="hideAllModals(); deletePost(${post.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    document.getElementById('post-detail-content').innerHTML = detailHTML;
    showModal('post-detail');
}

async function handlePostSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const published = document.getElementById('post-published').checked;
    const editId = document.getElementById('edit-post-id').value;
    const submitBtn = document.getElementById('post-submit');
    const errorEl = document.getElementById('post-error');

    errorEl.classList.add('hidden');

    if (!state.token) {
        showToast('Please log in first', 'error');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const isEditing = !!editId;
        const url = isEditing ? `${API_BASE}/posts/${editId}` : `${API_BASE}/posts`;
        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`,
            },
            body: JSON.stringify({ title, content, published }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Something went wrong');
        }

        hideAllModals();
        showToast(isEditing ? 'Post updated! ✏️' : 'Post published! 🚀', 'success');
        resetAndFetchPosts();
    } catch (err) {
        showFormError(errorEl, err.message);
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

function editPost(id) {
    const postData = state.posts.find(p => p.Post.id === id);
    if (!postData) return;
    const post = postData.Post;

    document.getElementById('edit-post-id').value = post.id;
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-content').value = post.content;
    document.getElementById('post-published').checked = post.published;
    document.getElementById('post-modal-title').textContent = 'Edit Post';
    document.getElementById('post-modal-subtitle').textContent = 'Update your post';
    document.getElementById('post-submit').querySelector('.btn-text').textContent = 'Save Changes';
    updateCharCount();
    showModal('create-post');
}

async function deletePost(id) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;
    if (!state.token) return;

    try {
        const res = await fetch(`${API_BASE}/posts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` },
        });

        if (!res.ok && res.status !== 204) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to delete');
        }

        showToast('Post deleted', 'info');
        resetAndFetchPosts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ════════════════════════════════
// VOTES
// ════════════════════════════════

async function toggleVote(postId, dir) {
    if (!state.token) {
        showToast('Please log in to vote', 'error');
        showModal('login');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`,
            },
            body: JSON.stringify({ post_id: postId, dir: dir ? 1 : 0 }),
        });

        if (!res.ok) {
            const err = await res.json();
            // If already voted, remove vote
            if (res.status === 409) {
                await fetch(`${API_BASE}/vote`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${state.token}`,
                    },
                    body: JSON.stringify({ post_id: postId, dir: 0 }),
                });
                showToast('Vote removed', 'info');
                resetAndFetchPosts();
                return;
            }
            throw new Error(err.detail || 'Vote failed');
        }

        showToast('Vote recorded! 👍', 'success');
        resetAndFetchPosts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ════════════════════════════════
// SEARCH
// ════════════════════════════════

function setupSearchDebounce() {
    let timeout;
    const searchInput = document.getElementById('search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');

    const handleSearch = (value) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            state.searchQuery = value.trim();
            state.filterMyPosts = false;
            updateFilterButtons();
            resetAndFetchPosts();
        }, 400);
    };

    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    mobileSearchInput.addEventListener('input', (e) => {
        handleSearch(e.target.value);
        searchInput.value = e.target.value;
    });
}

// ════════════════════════════════
// FILTER / NAVIGATION
// ════════════════════════════════

function showAllPosts() {
    state.filterMyPosts = false;
    updateFilterButtons();
    document.getElementById('feed-title').textContent = 'Latest Posts';
    renderPosts();
}

function showMyPosts() {
    if (!state.token) {
        showToast('Please log in first', 'error');
        return;
    }
    state.filterMyPosts = true;
    updateFilterButtons();
    document.getElementById('feed-title').textContent = 'My Posts';
    renderPosts();
    closeUserDropdown();
    document.getElementById('feed-section').scrollIntoView({ behavior: 'smooth' });
}

function updateFilterButtons() {
    const allBtn = document.getElementById('btn-all-posts');
    allBtn.classList.toggle('active', !state.filterMyPosts);
}

function loadMorePosts() {
    fetchPosts(true);
}

function resetAndFetchPosts() {
    state.posts = [];
    state.hasMore = true;
    fetchPosts();
}

// ════════════════════════════════
// MODALS
// ════════════════════════════════

function showModal(type) {
    hideAllModals();
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(`modal-${type}`);
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Reset create post form if opening fresh
    if (type === 'create-post' && !document.getElementById('edit-post-id').value) {
        document.getElementById('post-form').reset();
        document.getElementById('post-published').checked = true;
        document.getElementById('post-modal-title').textContent = 'Create Post';
        document.getElementById('post-modal-subtitle').textContent = 'Share something with the community';
        document.getElementById('post-submit').querySelector('.btn-text').textContent = 'Publish';
        updateCharCount();
    }
}

function hideAllModals() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.body.style.overflow = '';

    // Reset forms
    document.getElementById('edit-post-id').value = '';
    document.querySelectorAll('.form-error').forEach(e => e.classList.add('hidden'));
}

function closeModal(e) {
    if (e.target === document.getElementById('modal-overlay')) {
        hideAllModals();
    }
}

function switchModal(type) {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById(`modal-${type}`).classList.remove('hidden');
}

// ════════════════════════════════
// USER DROPDOWN
// ════════════════════════════════

function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('hidden');
}

function closeUserDropdown() {
    document.getElementById('user-dropdown').classList.add('hidden');
}

function setupClickOutside() {
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('user-dropdown');
        const avatarBtn = document.getElementById('user-avatar-btn');
        if (!dropdown.classList.contains('hidden') && !avatarBtn.contains(e.target) && !dropdown.contains(e.target)) {
            closeUserDropdown();
        }
    });
}

// ════════════════════════════════
// MOBILE MENU
// ════════════════════════════════

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const hamburger = document.getElementById('nav-hamburger');
    menu.classList.toggle('hidden');
    hamburger.classList.toggle('active');
}

function closeMobileMenu() {
    document.getElementById('mobile-menu').classList.add('hidden');
    document.getElementById('nav-hamburger').classList.remove('active');
}

// ════════════════════════════════
// SCROLL
// ════════════════════════════════

function setupScrollListener() {
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const navbar = document.getElementById('navbar');
                navbar.classList.toggle('scrolled', window.scrollY > 20);
                ticking = false;
            });
            ticking = true;
        }
    });
}

// ════════════════════════════════
// TOAST NOTIFICATIONS
// ════════════════════════════════

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
}

// ════════════════════════════════
// HELPERS
// ════════════════════════════════

function setButtonLoading(btn, loading) {
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    if (loading) {
        text.classList.add('hidden');
        spinner.classList.remove('hidden');
        btn.disabled = true;
    } else {
        text.classList.remove('hidden');
        spinner.classList.add('hidden');
        btn.disabled = false;
    }
}

function showFormError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.style.opacity = isPassword ? '1' : '0.5';
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function updateStats() {
    const totalPosts = state.posts.length;
    const totalVotes = state.posts.reduce((sum, p) => sum + (p.votes || 0), 0);
    document.getElementById('stat-posts').textContent = totalPosts;
    document.getElementById('stat-votes').textContent = totalVotes;
}

function setupTitleCharCount() {
    const titleInput = document.getElementById('post-title');
    titleInput.addEventListener('input', updateCharCount);
}

function updateCharCount() {
    const titleInput = document.getElementById('post-title');
    document.getElementById('title-char-count').textContent = titleInput.value.length;
}

// ─── Keyboard shortcuts ───
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideAllModals();
        closeMobileMenu();
        closeUserDropdown();
    }
});
