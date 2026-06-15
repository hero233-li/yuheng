import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { useMutation } from '@tanstack/react-query';
import { App, Typography } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';
import { login } from '../../api/app';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const auth = useAuthStore();
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      auth.login({ username: data.username, terminalName: data.terminal_name });
      message.success('登录成功');
      navigate('/product-apply', { replace: true });
    },
    onError: (error) => message.error(error.message),
  });

  if (auth.isLoggedIn) {
    return <Navigate to="/product-apply" replace />;
  }

  return (
    <div className="login-page">
      <LoginForm
        title="内网自动化系统"
        subTitle="默认账号 user / terminal001"
        initialValues={{ username: 'user', password: 'terminal001' }}
        onFinish={async (values) => {
          await loginMutation.mutateAsync({
            username: String(values.username || ''),
            password: String(values.password || ''),
          });
          return true;
        }}
        submitter={{ searchConfig: { submitText: '登录' }, submitButtonProps: { loading: loginMutation.isPending } }}
      >
        <ProFormText
          name="username"
          fieldProps={{ prefix: <UserOutlined /> }}
          placeholder="用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
        />
        <ProFormText.Password
          name="password"
          fieldProps={{ prefix: <LockOutlined /> }}
          placeholder="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        />
        <Typography.Text type="secondary">密码默认等于当前终端名。</Typography.Text>
      </LoginForm>
    </div>
  );
}
