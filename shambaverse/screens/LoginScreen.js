import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shambaverse</Text>
      <Text style={styles.subtitle}>Entrar na plataforma agro inteligente</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#7d8590"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#7d8590"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Main")}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.link}>Criar conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
    padding: 24,
    justifyContent: "center"
  },
  title: {
    color: "#e6edf3",
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: "#7d8590",
    marginBottom: 24
  },
  input: {
    backgroundColor: "#161b22",
    borderRadius: 8,
    padding: 12,
    color: "#e6edf3",
    marginBottom: 12
  },
  button: {
    backgroundColor: "#238636",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600"
  },
  link: {
    color: "#3fb950",
    marginTop: 16,
    textAlign: "center"
  }
});
