import 'dart:io' show Platform;
import 'package:flutter/material.dart';

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
  late final Map<String, dynamic> _info;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSystemInfo();
  }

  // 直接从本地获取系统信息（无需后端）
  Future<void> _loadSystemInfo() async {
    String arch = 'unknown';
    final platformVersion = Platform.version;
    if (platformVersion.contains('64')) {
      arch = 'amd64';
    } else if (platformVersion.contains('32') || platformVersion.contains('86')) {
      arch = 'x86';
    }

    setState(() {
      _info = {
        'name': '冠久ERP',
        'version': '1.0.0',
        'os': Platform.operatingSystem,
        'arch': arch,
        'hostname': Platform.localHostname,
        'processors': Platform.numberOfProcessors,
      };
      _loading = false;
    });
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    await Future.delayed(const Duration(milliseconds: 500));
    _loadSystemInfo();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('冠久ERP'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
          ),
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () {
              showAboutDialog(
                context: context,
                applicationName: '冠久ERP',
                applicationVersion: '1.0.0',
                applicationLegalese: '© 2026 聚隆科技',
              );
            },
          ),
        ],
      ),
      body: Center(
        child: _loading
            ? const CircularProgressIndicator()
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
                        '应用名称: ${_info['name']}',
                        style: const TextStyle(fontSize: 18),
                      ),
                      Text('版本: ${_info['version']}'),
                      const Divider(),
                      Text('系统: ${_info['os']}'),
                      Text('架构: ${_info['arch']}'),
                      Text('主机名: ${_info['hostname']}'),
                      Text('CPU 核心数: ${_info['processors']}'),
                      const SizedBox(height: 16),
                      const Text(
                        '单机模式（无后端依赖）',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _refresh,
        child: const Icon(Icons.refresh),
      ),
    );
  }
}
