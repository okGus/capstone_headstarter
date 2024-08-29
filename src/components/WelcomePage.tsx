'use client'
// WelcomePage.tsx
import React from 'react';
import { Box, Button, Modal, Typography, TextField } from '@mui/material';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { useUser } from "@clerk/nextjs";

const WelcomePage: React.FC = () => {
  const [openPostCreation, setOpenPostCreation] = React.useState(false);
  const [postTitleText, setPostTitleText] = React.useState("");
  const [postContentText, setPostContentText] = React.useState("");

  const { user } = useUser();

  const createPost = () => {
    setOpenPostCreation(true);
  }

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
          body: JSON.stringify({ title: postTitleText, content: postContentText, userId: user?.id }),
        }
      );
      if (response.ok) {
        setPostTitleText("");
        setPostContentText("");
        const data = await response.json();
      } else {
        alert("Failed to submit transcript");
      }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f8',
      }}
    >
      <Button variant="contained" color="primary" onClick={createPost}>
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
