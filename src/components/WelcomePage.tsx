'use client'
// WelcomePage.tsx
import React from 'react';
import { Box, Button, Modal, Typography, TextField, Card, CardContent, CardActions } from '@mui/material';
import { useUser } from "@clerk/nextjs";
import { useEffect } from 'react';

const WelcomePage: React.FC = () => {
  const [openPostCreation, setOpenPostCreation] = React.useState(false);
  const [postTitleText, setPostTitleText] = React.useState("");
  const [postContentText, setPostContentText] = React.useState("");
  const [posts, setPosts] = React.useState<any[]>([]);
  const { user } = useUser();

  useEffect(() => {
    const fetchPosts = async () => {
      const response = await fetch("/api/get-posts");
      if (response.ok) {
        const data = await response.json();
        const transformedPosts = data.items.map((post: any) => ({
          Title: post.Title,
          Content: post.Content,
          Likes: parseInt(post.Likes, 10), // Convert from { N: 'number' } to number
          CreatedAt: post.CreatedAt,
          PostPK: post.PostPK,
        }));
        setPosts(transformedPosts);
      }
    };
    fetchPosts();
  }, []);

  const createPost = () => {
    setOpenPostCreation(true);
  }

  const likePost = async (postId: string) => {
    const response = await fetch(
      "/api/like-post",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId }),
      }
    );
    if (response.ok) {
      // Re-fetch posts after successfully liking a post
      const fetchPosts = async () => {
        const response = await fetch("/api/get-posts");
        if (response.ok) {
          const data = await response.json();
          const transformedPosts = data.items.map((post: any) => ({
            Title: post.Title,
            Content: post.Content,
            Likes: parseInt(post.Likes, 10), // Convert from { N: 'number' } to number
            CreatedAt: post.CreatedAt,
            PostPK: post.PostPK,
          }));
          setPosts(transformedPosts);
        }
      };
      fetchPosts();
    } else {
      alert("Failed to like post");
    }
  };

  const handlePostCreationClose = async () => {
    setOpenPostCreation(false);

    if (postTitleText.trim() === "" || postContentText.trim() === "") {
      return;
    }
    const response = await fetch(
      "/api/save-posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: postTitleText, content: postContentText, userId: user?.id, likes: 0 }),
      }
    );
    if (response.ok) {
      // Clear the input fields
      setPostTitleText("");
      setPostContentText("");
  
      // Re-fetch posts after successfully creating a new post
      const fetchPosts = async () => {
        const response = await fetch("/api/get-posts");
        if (response.ok) {
          const data = await response.json();
          console.log(data.items)
          const transformedPosts = data.items.map((post: any) => ({
            Title: post.Title,
            Content: post.Content,
            Likes: parseInt(post.Likes, 10), // Convert from { N: 'number' } to number
            CreatedAt: post.CreatedAt,
            PostPK: post.PostPK,
          }));
          console.log(transformedPosts)
          setPosts(transformedPosts);
        }
      };
      fetchPosts();
      console.log(posts)

    } else {
      alert("Failed to create post");
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
        padding: 4,
      }}
    >
      {/* Display posts as cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 2,
          width: '100%',
        }}
      >
        {posts.map((post, index) => (
          <Card key={index} sx={{ maxWidth: 345 }}>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                {post.Title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {post.Content}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Likes: {post.Likes}
              </Typography>
            </CardContent>
            <CardActions>
              <Typography variant="caption" color="text.secondary">
                Created at: {new Date(post.CreatedAt).toLocaleString()}
              </Typography>
              <Button size="small" onClick={() => likePost(post.PostPK)}>Like</Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      <Button
        variant="contained"
        color="primary"
        onClick={createPost}
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
        }}
      >
        Create Post
      </Button>
      <Modal
        open={openPostCreation}
        onClose={handlePostCreationClose}
        aria-labelledby="create-post-modal-title"
        aria-describedby="create-post-modal-description"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            outline: 'none',
          }}
        >
          <Typography id="create-post-modal-title" variant="h6" component="h2" gutterBottom style={{color: 'black'}}>
            Create Post
          </Typography>
          <Box
            component="form"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
            noValidate
            autoComplete="off"
          >
            <TextField
              fullWidth
              label="Title"
              variant="outlined"
              value={postTitleText}
              onChange={(e) => setPostTitleText(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Content"
              variant="outlined"
              value={postContentText}
              onChange={(e) => setPostContentText(e.target.value)}
              required
              multiline
              rows={4}
            />
            <Button variant="contained" color="primary" onClick={handlePostCreationClose}>
              Create
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default WelcomePage;
