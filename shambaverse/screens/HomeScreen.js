import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from "react-native";
import Navbar from "../components/Navbar";

const initialPosts = [
  {
    id: "1",
    author: "Maria Farm",
    handle: "@mariafazenda",
    content: "Colheita do dia! 80 sacos de mandioca premium com entrega em Luanda e Benguela.",
    time: "4h",
    likes: 567
  },
  {
    id: "2",
    author: "Dr. Silva Agrônomo",
    handle: "@drsilva",
    content: "Preços do dia - Huambo: Milho 12.500 Kz, Mandioca 8.000 Kz.",
    time: "6h",
    likes: 1234
  }
];

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState(initialPosts);
  const [text, setText] = useState("");

  const publishPost = () => {
    if (!text.trim()) return;
    const newPost = {
      id: Date.now().toString(),
      author: "João Manuel",
      handle: "@joaoprodutor",
      content: text,
      time: "Agora",
      likes: 0
    };
    setPosts([newPost, ...posts]);
    setText("");
    Alert.alert("Publicado", "Post publicado com sucesso!");
  };

  return (
    <View style={styles.container}>
      <Navbar title="Página Inicial" />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="O que está acontecendo no campo?"
          placeholderTextColor="#7d8590"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.button} onPress={publishPost}>
          <Text style={styles.buttonText}>Postar</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <Text style={styles.postAuthor}>{item.author} <Text style={styles.postHandle}>{item.handle}</Text></Text>
            <Text style={styles.postContent}>{item.content}</Text>
            <View style={styles.postMeta}>
              <Text style={styles.postTime}>{item.time}</Text>
              <Text style={styles.postLikes}>❤️ {item.likes}</Text>
            </View>
          </View>
        )}
      />
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate("Chat")}>
          <Text style={styles.quickText}>Abrir Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton} onPress={() => navigation.navigate("Profile")}>
          <Text style={styles.quickText}>Ver Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117"
  },
  composer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d"
  },
  input: {
    backgroundColor: "#161b22",
    borderRadius: 8,
    padding: 12,
    color: "#e6edf3",
    marginBottom: 10
  },
  button: {
    backgroundColor: "#238636",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600"
  },
  post: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d"
  },
  postAuthor: {
    color: "#e6edf3",
    fontWeight: "700"
  },
  postHandle: {
    color: "#7d8590",
    fontWeight: "400"
  },
  postContent: {
    color: "#e6edf3",
    marginTop: 8
  },
  postMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  postTime: {
    color: "#7d8590",
    fontSize: 12
  },
  postLikes: {
    color: "#7d8590",
    fontSize: 12
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16
  },
  quickButton: {
    borderColor: "#238636",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  quickText: {
    color: "#3fb950",
    fontWeight: "600"
  }
});
