import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar conta</Text>
      <Text style={styles.subtitle}>Junte-se à rede agro de Angola</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome completo"
        placeholderTextColor="#7d8590"
        value={name}
        onChangeText={setName}
      />
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
        <Text style={styles.buttonText}>Criar conta</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Já tenho conta</Text>
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
