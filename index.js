// API URLs
const API_BASE_URL = 'https://jsonplaceholder.typicode.com';

// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const tabs = document.querySelectorAll('.tab');
const loader = document.getElementById('loader');
const totalPostsEl = document.getElementById('totalPosts');
const totalCommentsEl = document.getElementById('totalComments');
const totalUsersEl = document.getElementById('totalUsers');
const paginationEl = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// Modal Elements
const postModal = document.getElementById('postModal');
const modalTitle = document.getElementById('modalTitle');
const closePostModal = document.getElementById('closePostModal');
const openCreateModal = document.getElementById('openCreateModal');
const postForm = document.getElementById('postForm');
const postIdInput = document.getElementById('postId');
const titleInput = document.getElementById('title');
const bodyInput = document.getElementById('body');

// Read More Modal Elements
const readMoreModal = document.getElementById('readMoreModal');
const readMoreTitle = document.getElementById('readMoreTitle');
const readMoreBody = document.getElementById('readMoreBody');
const commentsContainer = document.getElementById('commentsContainer');
const closeReadMoreModal = document.getElementById('closeReadMoreModal');

// Global Variables
let allPosts = [];
let posts = [];
let comments = [];
let users = [];
let currentTab = 'all';
let currentPage = 1;
let postsPerPage = 6;
let searchQuery = '';

// Initialize the app
function init() {
    fetchStats();
    fetchPosts();

    // Event Listeners
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.getAttribute('data-tab');
            currentPage = 1;
            filterAndRenderPosts();
        });
    });

    // Search Event Listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Modal Event Listeners
    openCreateModal.addEventListener('click', openPostModalForCreate);
    closePostModal.addEventListener('click', () => postModal.style.display = 'none');
    closeReadMoreModal.addEventListener('click', () => readMoreModal.style.display = 'none');
    postForm.addEventListener('submit', handlePostSubmit);

    // Close modals if clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === postModal) postModal.style.display = 'none';
        if (e.target === readMoreModal) readMoreModal.style.display = 'none';
    });
}

// Fetch initial statistics
async function fetchStats() {
    try {
        const [postsRes, commentsRes, usersRes] = await Promise.all([
            fetch(`${API_BASE_URL}/posts`),
            fetch(`${API_BASE_URL}/comments`),
            fetch(`${API_BASE_URL}/users`)
        ]);

        const postsData = await postsRes.json();
        comments = await commentsRes.json();
        users = await usersRes.json();

        totalPostsEl.textContent = postsData.length;
        totalCommentsEl.textContent = comments.length;
        totalUsersEl.textContent = users.length;
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Fetch all posts
async function fetchPosts() {
    showLoader();
    try {
        const response = await fetch(`${API_BASE_URL}/posts`);
        allPosts = await response.json();
        
        // Fetch comments count for each post
        const commentsPromises = allPosts.map(post => 
            fetch(`${API_BASE_URL}/posts/${post.id}/comments`)
                .then(res => res.json())
                .then(comments => {
                    post.commentsCount = comments.length;
                    return post;
                })
        );
        
        await Promise.all(commentsPromises);
        filterAndRenderPosts();
    } catch (error) {
        console.error('Error fetching posts:', error);
        postsContainer.innerHTML = '<div class="no-posts">Error loading posts. Please try again later.</div>';
    } finally {
        hideLoader();
    }
}

// Handle search
function handleSearch() {
    searchQuery = searchInput.value.trim().toLowerCase();
    currentPage = 1;
    filterAndRenderPosts();
}

// Filter posts based on tab and search query
function filterAndRenderPosts() {
    // First filter by search query
    let filteredPosts = allPosts;
    
    if (searchQuery) {
        filteredPosts = allPosts.filter(post => 
            post.title.toLowerCase().includes(searchQuery) || 
            post.body.toLowerCase().includes(searchQuery)
        );
    }
    
    // Then filter by current tab
    switch(currentTab) {
        case 'all':
            posts = [...filteredPosts];
            break;
        case 'popular':
            // Sort by comments count (descending)
            posts = [...filteredPosts].sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
            break;
        case 'trending':
            // For trending, we'll get the newest posts (highest IDs in JSONPlaceholder)
            posts = [...filteredPosts].sort((a, b) => b.id - a.id);
            break;
    }

    renderPosts();
    renderPagination();
}

// Render posts based on current page
function renderPosts() {
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginatedPosts = posts.slice(startIndex, endIndex);

    if (posts.length === 0) {
        postsContainer.innerHTML = '<div class="no-posts">No posts found</div>';
        paginationEl.innerHTML = '';
        return;
    }

    postsContainer.innerHTML = '';
    paginatedPosts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        postCard.innerHTML = `
            <h3 class="post-title">${post.title}</h3>
            <p class="post-body">${post.body}</p>
            <div class="post-actions">
                <button class="post-action-btn read-btn" data-id="${post.id}">Read More</button>
                <button class="post-action-btn edit-btn" data-id="${post.id}">Edit</button>
                <button class="post-action-btn delete-btn" data-id="${post.id}">Delete</button>
            </div>
        `;
        postsContainer.appendChild(postCard);
    });

    // Add event listeners to action buttons
    document.querySelectorAll('.read-btn').forEach(btn => {
        btn.addEventListener('click', () => openReadMoreModal(btn.getAttribute('data-id')));
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openPostModalForEdit(btn.getAttribute('data-id')));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deletePost(btn.getAttribute('data-id')));
    });
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(posts.length / postsPerPage);
    
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                ${currentPage === 1 ? 'disabled' : 'data-page="prev"'}>
            &laquo;
        </button>
    `;
    
    // Page buttons
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                ${currentPage === totalPages ? 'disabled' : 'data-page="next"'}>
            &raquo;
        </button>
    `;
    
    paginationEl.innerHTML = paginationHTML;
    
    // Add event listeners to pagination buttons
    document.querySelectorAll('.pagination-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-page');
            
            if (page === 'prev') {
                currentPage = Math.max(1, currentPage - 1);
            } else if (page === 'next') {
                currentPage = Math.min(totalPages, currentPage + 1);
            } else {
                currentPage = parseInt(page);
            }
            
            renderPosts();
            renderPagination();
            
            // Scroll to top of posts container
            postsContainer.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// Create Post Modal
function openPostModalForCreate() {
    modalTitle.textContent = 'Create New Post';
    postIdInput.value = '';
    titleInput.value = '';
    bodyInput.value = '';
    postModal.style.display = 'block';
}

// Edit Post Modal
function openPostModalForEdit(postId) {
    const post = allPosts.find(p => p.id.toString() === postId);
    if (!post) return;

    modalTitle.textContent = 'Edit Post';
    postIdInput.value = post.id;
    titleInput.value = post.title;
    bodyInput.value = post.body;
    postModal.style.display = 'block';
}

// Handle Post Submit (Create or Edit)
async function handlePostSubmit(e) {
    e.preventDefault();
    
    const postData = {
        title: titleInput.value,
        body: bodyInput.value,
        userId: 1 // Using a fixed userId for simplicity
    };

    try {
        let response;
        let message;

        if (postIdInput.value) {
            // Edit existing post
            response = await fetch(`${API_BASE_URL}/posts/${postIdInput.value}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });
            message = 'Post updated successfully!';

            // Update in our local array
            const index = allPosts.findIndex(p => p.id.toString() === postIdInput.value);
            if (index !== -1) {
                allPosts[index] = { ...allPosts[index], ...postData };
            }
        } else {
            // Create new post
            response = await fetch(`${API_BASE_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });
            message = 'Post created successfully!';
            
            // Add to our local array (with a fake id for UI purposes)
            const newPost = await response.json();
            allPosts.unshift({ ...newPost, id: Date.now(), commentsCount: 0 }); // Using timestamp as ID
        }

        if (response.ok) {
            alert(message);
            postModal.style.display = 'none';
            filterAndRenderPosts();
        } else {
            throw new Error('Failed to save post');
        }
    } catch (error) {
        console.error('Error saving post:', error);
        alert('There was an error saving your post. Please try again.');
    }
}

// Read More Modal
async function openReadMoreModal(postId) {
    const post = allPosts.find(p => p.id.toString() === postId);
    if (!post) return;

    readMoreTitle.textContent = post.title;
    readMoreBody.textContent = post.body;
    
    // Clear previous comments
    commentsContainer.innerHTML = '<div class="loader"><div></div></div>';
    
    // Show modal right away
    readMoreModal.style.display = 'block';
    
    try {
        // Fetch comments for this post
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
        const comments = await response.json();
        
        if (comments.length === 0) {
            commentsContainer.innerHTML = '<p>No comments yet.</p>';
            return;
        }
        
        commentsContainer.innerHTML = '';
        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author">${comment.name}</div>
                    <div class="comment-email">${comment.email}</div>
                </div>
                <div class="comment-body">${comment.body}</div>
            `;
            commentsContainer.appendChild(commentElement);
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        commentsContainer.innerHTML = '<p>Error loading comments. Please try again later.</p>';
    }
}

// Delete Post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Remove from our local array
            allPosts = allPosts.filter(p => p.id.toString() !== postId);
            alert('Post deleted successfully!');
            filterAndRenderPosts();
        } else {
            throw new Error('Failed to delete post');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('There was an error deleting the post. Please try again.');
    }
}

// Utility functions
function showLoader() {
    loader.style.display = 'flex';
    postsContainer.style.display = 'none';
}

function hideLoader() {
    loader.style.display = 'none';
    postsContainer.style.display = 'grid';
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);
