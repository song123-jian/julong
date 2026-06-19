import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  runApp(const RJBCApp());
}

class RJBCApp extends StatelessWidget {
  const RJBCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '冠久ERP',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String _baseUrl = 'http://localhost:8080';
  Map<String, dynamic>? _info;
  String? _error;
  bool _loading = true;
  bool _configLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  // 从 SharedPreferences 加载后端地址
  Future<void> _loadConfig() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString('backend_url');
    setState(() {
      _baseUrl = savedUrl ?? 'http://localhost:8080';
      _configLoaded = true;
    });
    _fetchInfo();
  }

  // 保存后端地址到 SharedPreferences
  Future<void> _saveConfig(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('backend_url', url);
    setState(() {
      _baseUrl = url;
    });
    _fetchInfo();
  }

  Future<void> _fetchInfo() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await http.get(Uri.parse('$_baseUrl/api/info'));
      if (response.statusCode == 200) {
        setState(() {
          _info = jsonDecode(response.body);
          _loading = false;
        });
      } else {
        setState(() {
          _error = '服务器返回: ${response.statusCode}';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = '无法连接后端: $e';
        _loading = false;
      });
    }
  }

  // 显示配置对话框
  Future<void> _showConfigDialog() async {
    final controller = TextEditingController(text: _baseUrl);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('配置后端地址'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: '后端 API 地址',
            hintText: 'http://192.168.1.5:8080',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('保存'),
          ),
        ],
      ),
    );
    if (result != null && result.isNotEmpty) {
      await _saveConfig(result);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_configLoaded) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('冠久ERP'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showConfigDialog,
            tooltip: '配置后端地址',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchInfo,
          ),
        ],
      ),
      body: Center(
        child: _loading
            ? const CircularProgressIndicator()
            : _error != null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline,
                          size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _fetchInfo,
                        child: const Text('重试'),
                      ),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        onPressed: _showConfigDialog,
                        icon: const Icon(Icons.settings),
                        label: const Text('修改后端地址'),
                      ),
                    ],
                  )
                : Card(
                    margin: const EdgeInsets.all(32),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.check_circle,
                              size: 64, color: Colors.green),
                          const SizedBox(height: 16),
                          Text(
                            '应用名称: ${_info?['name'] ?? '-'}',
                            style: const TextStyle(fontSize: 18),
                          ),
                          Text('版本: ${_info?['version'] ?? '-'}'),
                          Text('系统: ${_info?['os'] ?? '-'}'),
                          Text('架构: ${_info?['arch'] ?? '-'}'),
                          const SizedBox(height: 16),
                          Text(
                            '后端: $_baseUrl',
                            style: const TextStyle(
                                fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _fetchInfo,
        child: const Icon(Icons.refresh),
      ),
    );
  }
}
